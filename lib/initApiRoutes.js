const path = require('path');
const jsonfile = require("jsonfile")
const nunjucks = require("nunjucks");
const deepExtend = require("deep-extend");
import { get, set, isObject } from 'lodash-es';
nunjucks.configure({ autoescape: true });

export function initApiRoutes ({app}) {

  app.post('/save', async (req, res) => {
    let user = req.cookies.user;
    let existingData = await jsonfile.readFile(path.join(__dirname, `../data/${user}.json`), {encoding: "utf8"});
    let incomingData = req.body.data;
    let savePath = req.body.path;

    let data;
    if (!savePath) {
      deepExtend(existingData, incomingData);
    } else {
      let dataAtPath = get(existingData, savePath);

      if (isObject(dataAtPath)) {
        deepExtend(dataAtPath, incomingData);
      } else {
        set(existingData, savePath, incomingData);
      }
    }

    jsonfile.writeFile(path.join(__dirname, `../data/${user}.json`), existingData, { spaces: 2 }, function () {
      res.json({data: data});
    });
  })

  app.post('/new', async (req, res) => {
    let templateName = req.body.templateName;
    let partialPath = path.join(__dirname, "../templates/partials/" + templateName + "/index.njk");
    let startingDataPath = path.join(__dirname, "../templates/partials/" + templateName + "/data.json");
    let startingData = await jsonfile.readFile(startingDataPath);
    let htmlString = nunjucks.render(partialPath, startingData);

    res.json({htmlString});
  })

}