const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const Lokka = require('lokka').Lokka;
const Transport = require('lokka-transport-http').Transport;
const Hexo = require('hexo');

const token = process.env.GITHUB_TOKEN;

const client = new Lokka({
    transport: new Transport('https://api.github.com/graphql', {
        headers: {
            Authorization: `bearer ${token}`
        }
    })
});

client.query(`
{
  repository(owner: "gwuhaolin", name: "blog") {
    issues(first: 100, orderBy: {field: CREATED_AT, direction: ASC}, states: [OPEN]) {
      edges {
        node {
          title
          body
          createdAt
          url
          labels(first:100) {
            edges {
              node {
                name
              }
            }
          }
        }
      }
      totalCount
    }
  }
}
`).then(result => {
    result.repository.issues.edges.forEach((em) => {
        const {title, body, createdAt, url, labels} = em.node;
        const tags = labels.edges.map(em => em.node.name);
        const mdContent = `---
title: ${title}
date: ${createdAt}
url: ${url}
tags:
${tags.map(tag => `    - ${tag}`).join('\n')}
---

${body}`;
        fs.writeFileSync(`hexo/source/_posts/${title}.md`, mdContent);
    });
    console.info('更新 md 完毕');
    execSync(`rm -rf hexo/public`);
    fs.mkdirSync('hexo/public');
    fs.writeFileSync('hexo/public/CNAME', 'wuhaolin.cn');

    const hexo = new Hexo(path.resolve(process.cwd(), 'hexo'), {});
    hexo.init().then(function () {
        hexo.call('generate', {
            deploy: true,
        }).then(function () {
            // ...
        });
    });
}).catch(err => {
    console.error(err);
});

