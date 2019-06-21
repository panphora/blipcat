const dirTree = require("directory-tree");
const tree = dirTree("./templates", {
  extensions: /\.(njk|json)$/
});
const util = require('util');
const fs = require('fs');
const path = require('path');
const readFile = util.promisify(fs.readFile);
const jsonfile = require("jsonfile");
const parseUrl = require('parseurl');
const nunjucks = require("nunjucks");
nunjucks.configure({ autoescape: true });

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

async function assemblePages () {
  let pages = [];
  let pagesData = tree.children.find(obj => obj.name === "pages").children;

  await asyncForEach(pagesData, async (pagesChild) => {
    let page = {};

    page.pageName = pagesChild.name; // e.g. "home"
    page.configPath = pagesChild.children.find(file => file.name === "config.json").path; // e.g. "home"
    page.templatePath = pagesChild.children.find(file => file.name === "index.njk").path; // e.g. "home"
    
    let configJson = await jsonfile.readFile(path.join(__dirname, "../", page.configPath), {encoding: "utf8"});
    page.route = configJson.route;
    page.title = configJson.title;

    let templateString = await readFile(path.join(__dirname, "../", page.templatePath), "utf8");
    page.templateString = templateString;
    
    pages.push(page);
  });

  return pages; // output: [{pageName, configPath, templatePath, route, title, templateString}]

}

export async function initRenderedRoutes ({app}) {
  let pages = await assemblePages();

  pages.forEach(({pageName, configPath, templatePath, route, title, templateString}) => {

    app.get(route, async (req, res) => {
      let params = req.params;
      let query = req.query;
      let pathname = parseUrl(req).pathname;
      let user = req.cookies.user;
      let data = await jsonfile.readFile(path.join(__dirname, `../data/${user}.json`), {encoding: "utf8"});

      let html = nunjucks.render(templatePath, {
        title,
        data,
        params,
        query,
        pathname
      });

      res.send(html);
    });
  });
}







