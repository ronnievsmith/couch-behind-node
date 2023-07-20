/*
 Ronnie Royston (https://ronnieroyston.com)
*/
import { promises as fs } from 'fs';
import {JSDOM} from "jsdom";

class Doc {
  constructor(options = {}) {
    this.start = Date.now();
    this.dom = new JSDOM('<!DOCTYPE html><html lang="en" prefix="og: http://ogp.me/ns#">');
    this.doc = this.dom.window.document;
    this.options = options;
  }
  async build() {
    let headFileName = this.options.head || 'default';
    let headerFileName = this.options.header || 'default';
    let navFileName = this.options.nav || 'default';
    let asideFileName = this.options.aside || 'default';
    let mainFileName = this.options.main || 'default';
    let footerFileName = this.options.footer || 'default';
    let dialogFileName = this.options.dialog || 'default';
    let toastFileName = this.options.toast || 'default';
    let bodyClass = this.options.bodyClass;

    let [headFile, headerFile, navFile, asideFile, mainFile, footerFile, dialogFile, toastFile] = await Promise.all([
      fs.readFile(`templates/head/${headFileName}.html`, 'utf8'),
      fs.readFile(`templates/header/${headerFileName}.html`, 'utf8'),
      fs.readFile(`templates/nav/${navFileName}.html`, 'utf8'),
      fs.readFile(`templates/aside/${asideFileName}.html`, 'utf8'),
      fs.readFile(`templates/main/${mainFileName}.html`, 'utf8'),
      fs.readFile(`templates/footer/${footerFileName}.html`, 'utf8'),
      fs.readFile(`templates/dialog/${dialogFileName}.html`, 'utf8'),
      fs.readFile(`templates/toast/${toastFileName}.html`, 'utf8'),
    ]);

    let head = JSDOM.fragment(headFile);
    let header = JSDOM.fragment(headerFile);
    let nav = JSDOM.fragment(navFile);
    let aside = JSDOM.fragment(asideFile);
    let main = JSDOM.fragment(mainFile);
    let footer = JSDOM.fragment(footerFile);
    let dialog = JSDOM.fragment(dialogFile);
    let toast = JSDOM.fragment(toastFile);
    let script = this.doc.createElement("script");
    script.src = "script.js";
    if(bodyClass){
      this.doc.body.classList.add(bodyClass);
    }

    this.doc.querySelector("head").appendChild(head);
    this.doc.querySelector("body").appendChild(header);
    this.doc.querySelector("body").appendChild(nav);
    this.doc.querySelector("body").appendChild(aside);
    this.doc.querySelector("body").appendChild(main);
    this.doc.querySelector("body").appendChild(footer);
    this.doc.querySelector("body").appendChild(dialog);
    this.doc.querySelector("body").appendChild(toast);
    this.doc.querySelector("body").appendChild(script);
    let finish = Date.now();
    let qty = finish - this.start;
    let timeElement = this.doc.querySelector("#time");
    if(timeElement){
      timeElement.textContent = qty;
    }
    return this.dom.serialize();
  }
}

export {Doc};