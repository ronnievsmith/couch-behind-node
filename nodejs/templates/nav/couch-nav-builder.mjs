// =================================================================================================
// run this script from the command line to fetch the API endpoints directly from CouchDB's website.
// the output of this script is an HTML snippet that will be made available to Node.js templating.
// =================================================================================================
import {promises as fs} from 'fs';
import path from "node:path";
import {JSDOM} from "jsdom";
const ROOT = "public/";
import https from "node:https";
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
// Allow SELF_SIGNED_CERT, aka set rejectUnauthorized: false
let options = {
  agent: httpsAgent
}
let url = "https://docs.couchdb.org/en/stable/api/index.html";
let apiCall = new Promise(function(resolve, reject) {
  var data = '';
  https.get(url, res => {
    res.on('data', function(chunk) {
      data += chunk
    })
    res.on('end', function() {
      resolve(data);
    })
  }).on('error', function(e) {
    reject(e);
  });
});

(async () => {
  try {
    let result = await apiCall;
    let dom = new JSDOM(result);
    let dom2 = new JSDOM();
    let doc = dom.window.document;
    let doc2 = dom2.window.document;
    let nav = doc2.createElement("nav");
    nav.id = "couch-nav"
    doc2.body.appendChild(nav);
    let uls = doc.querySelector(".toctree-wrapper").querySelectorAll("ul");
    let categoryNames = doc.querySelector(".toctree-wrapper").querySelectorAll("li.toctree-l1");
    categoryNames.forEach(function(category,index) {
      let categoryName = category.querySelector("a").textContent.replace(/\d+/g, '').replaceAll('.', '').trim();
      let categoryListItems = category.querySelector("ul").querySelectorAll("li");
      let details = doc2.createElement("details");
      console.log("index is " + index + " and category is " + categoryName)
      if(index === 1){
        details.open = true;
      }
      let summary = doc2.createElement("summary");
      let categoryText = doc2.createTextNode(categoryName);
      summary.appendChild(categoryText);
      details.appendChild(summary);
      if ("API Basics" !== categoryName) {
        let thisUl = doc2.createElement("ul");
        categoryListItems.forEach(function(li) {
          if (li.classList.contains("toctree-l2")) {
            let newLi = doc2.createElement("li");
            let newAnchor = doc2.createElement("a");
            newAnchor.href = "https://docs.couchdb.org/en/stable/api/" + li.querySelector("a").href;
            let newCode = doc2.createElement("code");
            if (li.querySelector("span")) {
              if (li.querySelector("span").textContent) {
                let newCodeText = doc2.createTextNode(li.querySelector("span").textContent);
                newCode.appendChild(newCodeText);
              }
            }
            let newSVG = new OpenInNewSVG();
            newSVG.classList.add("material-svg");
            newAnchor.appendChild(newSVG);
            newAnchor.setAttribute("target", "_blank");
            newLi.appendChild(newCode);
            newLi.appendChild(newAnchor);
            li.replaceChildren();
            li.appendChild(newCode)
            li.appendChild(newAnchor)
            thisUl.appendChild(li);
            if (!li.querySelector("code").textContent) {
              li.remove();
            }
          }
        });
        if (thisUl.childNodes.length) {
          details.appendChild(thisUl);
          doc2.body.querySelector("nav").appendChild(details);
        }
      }
    });
    fs.writeFile("couch.html", doc2.body.querySelector("nav").outerHTML);
  } catch (e) {
    console.error(e);
  } finally {
    console.log('Done.');
  }
})();

class OpenInNewSVG {
  constructor() {
    let dom = new JSDOM();
    let document = dom.window.document;
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    this.path.setAttribute("d", "M180 936q-24 0-42-18t-18-42V276q0-24 18-42t42-18h279v60H180v600h600V597h60v279q0 24-18 42t-42 18H180Zm202-219-42-43 398-398H519v-60h321v321h-60V319L382 717Z");
    this.path.setAttribute("fill", "#2962ff");
    this.svg.setAttribute("height", "48");
    this.svg.setAttribute("viewBox", "0 96 960 960");
    this.svg.setAttribute("width", "48");
    this.svg.appendChild(this.path);
    return this.svg;
  }
}