const { Client } = require("@notionhq/client")
const fs = require("fs/promises");
const path = require("path");

async function fetchNotionArticles() {
  try {
    // Initializing a client
    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
    })
    
    // データベース内のページ一覧を取得する
    const databaseId = process.env.NOTION_DATABASE_ID;
    const { results } = await notion.databases.query({
      database_id: databaseId,
      filter: {
        and: [
          {
            property: "is_posted",
            checkbox: {
              equals: false
            }
          }
        ]
      }
    })

    if (results.length === 0) {
      console.log("対象がないため処理を終了します")
      process.exit(0)
    }
    
    // ファイル内容を構成する
    let content = ''
    
    for (const r of results) {      
      // ファイル名を作成する(yyyy_mm_dd_permalink)
      const t = r.last_edited_time
      const permalink = r.properties.permalink.rich_text[0].text.content
      const fileName = `${t.substring(0,4)}_${t.substring(5,7)}_${t.substring(8,10)}_${permalink}.md`

      // ページ内容を取得する
      const b = await notion.blocks.children.list({
        block_id: r.id
      })

      // ファイル内容を作成する(markdownテキストを組み立てる)
      for (const br of b.results) {
        switch(br.type) {
          // パラグラフの場合
          case 'paragraph':
            let p = '';
            br.paragraph.rich_text.forEach((rt) => {
              const text = rt.text.content
              // リンクありテキストの場合
              if (rt.text.link) {
                const anchor = `[${text}](${rt.text.link.url})`
                p = p + anchor
              } else {
                // プレーンテキストの場合
                p = p + text
              }
            })
            content = content + p
            break

          // h2の場合
          case 'heading_2':
            const h2Text = br.heading_2.rich_text[0].plain_text
            const h2 = `## ${h2Text}`
            content = content + h2
            break

          // h3の場合
          case 'heading_3':
            const h3Text = br.heading_3.rich_text[0].plain_text
            const h3 = `### ${h3Text}`
            content = content + h3
            break

          default:
            break
        }

        // 改行用のspacer
        content = content + '  \n'
      }

      const filePath = path.join(__dirname, "..", "source", "_posts", fileName)

      await fs.writeFile(filePath, content, "utf-8")

      // ファイル内容を初期化
      content = ''
    }
  } catch (error) {
    // 適切なエラーハンドリング
  }
}

fetchNotionArticles()