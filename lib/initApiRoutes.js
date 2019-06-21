const path = require('path');
const jsonfile = require("jsonfile")
const nunjucks = require("nunjucks");
const deepExtend = require("deep-extend");
nunjucks.configure({ autoescape: true });

export function initApiRoutes ({app}) {

  app.post('/save', async (req, res) => {
    let user = req.cookies.user;
    let existingData = await jsonfile.readFile(path.join(__dirname, `../data/${user}.json`), {encoding: "utf8"});
    let data = deepExtend(existingData, req.body.data);

    jsonfile.writeFile(path.join(__dirname, `../data/${user}.json`), data, { spaces: 2 }, function () {
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