var cbn = (function() {
  let pub = {};
  let thisURL = new URL(window.location.href);
  readAuth()
  window.addEventListener("focus", readAuth);
  let arrHeaders = [];
  let protocol = 'HTTP/1.1';
  let responseBodyOutput = document.querySelector("#response-body > pre > code");
  let responseHeaders = document.querySelector("#response-headers > pre > code");
  let responseHeading = document.querySelector("#response-heading");

  class DeleteSVG {
    constructor() {
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
      this.path.setAttribute("d", "M261 936q-24 0-42-18t-18-42V306h-11q-12.75 0-21.375-8.675-8.625-8.676-8.625-21.5 0-12.825 8.625-21.325T190 246h158q0-13 8.625-21.5T378 216h204q12.75 0 21.375 8.625T612 246h158q12.75 0 21.375 8.675 8.625 8.676 8.625 21.5 0 12.825-8.625 21.325T770 306h-11v570q0 24-18 42t-42 18H261Zm0-630v570h438V306H261Zm106 454q0 12.75 8.675 21.375 8.676 8.625 21.5 8.625 12.825 0 21.325-8.625T427 760V421q0-12.75-8.675-21.375-8.676-8.625-21.5-8.625-12.825 0-21.325 8.625T367 421v339Zm166 0q0 12.75 8.675 21.375 8.676 8.625 21.5 8.625 12.825 0 21.325-8.625T593 760V421q0-12.75-8.675-21.375-8.676-8.625-21.5-8.625-12.825 0-21.325 8.625T533 421v339ZM261 306v570-570Z");
      this.path.setAttribute("fill","#2962ff");
      this.svg.setAttribute("height", "48");
      this.svg.setAttribute("viewBox", "0 96 960 960");
      this.svg.setAttribute("width", "48");
      this.svg.classList.add("delete", "material-svg");
      this.svg.appendChild(this.path);
      return this.svg;
    }
  }

  class DownloadSVG {
    constructor() {
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.path = document.createElementNS("http://www.w3.org/2000/svg", 'path');
      this.path.setAttribute("d", "M220-160q-24 0-42-18t-18-42v-143h60v143h520v-143h60v143q0 24-18 42t-42 18H220Zm260-153L287-506l43-43 120 120v-371h60v371l120-120 43 43-193 193Z");
      this.path.setAttribute("fill", "#2962ff");
      this.svg.setAttribute("height", "48");
      this.svg.setAttribute("viewBox", "0 -960 960 960");
      this.svg.setAttribute("width", "48");
      this.svg.classList.add("download", "material-svg-lg");
      this.svg.appendChild(this.path);
      return this.svg;
    }
  }

  class FileElement {
    constructor(id = "", name = "", length = 0) {
      this.div = document.createElement("div");
      this.txt = document.createTextNode(decodeURIComponent(name) + " (" + formatBytes(length) + ")");
      this.endpoint = thisURL.origin + "/buckets/" + id + "/" + encodeURIComponent(name);

      this.deleteButton = new DeleteSVG();
      this.deleteButton.dataset.href = this.endpoint
      this.deleteButton.dataset.name = encodeURIComponent(name);
      this.downloadAnchor = document.createElement("a");
      this.downloadAnchor.href = this.endpoint
      this.downloadAnchor.setAttribute("target", "_blank");
      this.downloadAnchor.appendChild(new DownloadSVG());
      this.div.appendChild(this.deleteButton);
      this.div.appendChild(this.downloadAnchor);
      this.div.appendChild(this.txt);
      
      this.div.classList.add("file")
      this.fragment = new DocumentFragment();
      this.fragment.appendChild(this.div);
      return this.fragment;
    }
  }

  class HeaderInputs {
    constructor(k="",v="", c="") {
      this.div = document.createElement("div");
      this.keyInput = document.createElement("input");
      this.keyInput.setAttribute("type","text");
      this.keyInput.classList.add("key");
      if(k){
        this.keyInput.value = k;
      }
      this.keyInputLabel = document.createElement("label");
      this.keyInputLabel.appendChild(document.createTextNode("key"));
      this.valueInput = document.createElement("input");
      this.valueInput.classList.add("val");
      this.valueInput.setAttribute("type","text");
      if(v){
        this.valueInput.value = v;
      }
      this.valueInputLabel = document.createElement("label");
      this.valueInputLabel.appendChild(document.createTextNode("value"));
      this.useInput = document.createElement("input");
      this.useInput.setAttribute("type","checkbox");
      if(c){
        this.useInput.checked = c;
      }
      this.breakEl = document.createElement("br");
      this.valueInputLabel.appendChild(this.valueInput);
      this.keyInputLabel.appendChild(this.keyInput);
      this.fragment = new DocumentFragment();
      this.div.appendChild(new DeleteSVG());
      this.div.appendChild(this.keyInputLabel);
      this.div.appendChild(this.valueInputLabel);
      this.div.appendChild(this.useInput);
      this.div.appendChild(this.breakEl);
      this.fragment.appendChild(this.div);
      return this.fragment;
    }
  }

  if(localStorage.getItem("url")){
    if(document.querySelector("#url")){
      document.querySelector("#url").value = localStorage.getItem("url");
    }
  }

  if(localStorage.getItem("username")){
    if(document.querySelector("#username")){
      document.querySelector("#username").value = localStorage.getItem("username");
    }  
  }

  if(localStorage.getItem("password")){
    if(document.querySelector("#password")){
      document.querySelector("#password").value = localStorage.getItem("password");
    }
  }

  if(document.querySelector("#url")){
    let add = document.querySelector("#url").value.toLowerCase();
    document.querySelector("#url").addEventListener("blur", function(e) {
      try {
        add = document.querySelector("#url").value.toLowerCase();
        if(!add.startsWith('http')){
          add = 'http://' + add;
        }
        document.querySelector("#path").textContent = new URL(add).pathname;
      } finally {
        if(add){
          localStorage.setItem("url", add);
        }
      }
    });
  }

  if(document.querySelector("#username")){
    document.querySelector("#username").addEventListener("blur", function(e) {
      localStorage.setItem("username", document.querySelector("#username").value);
    });
  }

  if(document.querySelector("#password")){
    document.querySelector("#password").addEventListener("blur", function(e) {
      localStorage.setItem("password", document.querySelector("#password").value);
    });
  }

  if(document.querySelectorAll(".fetch")){
    document.querySelectorAll(".fetch").forEach(function(button){
      button.addEventListener("click", fetchFunction, false);
    });
  }

  if(document.querySelectorAll("#couch-nav code")){
    document.querySelectorAll("#couch-nav code").forEach(function(link){
      link.addEventListener("click",couchLinkClick);
    })
  }

  if(document.querySelector("#basic-auth-cbx")){
    document.querySelector("#basic-auth-cbx").addEventListener("click", function(e){
      localStorage.setItem("basic-auth", document.querySelector('#basic-auth-cbx').checked)
    });   
  }

  if(document.querySelector("#add-header")){
    document.querySelector("#add-header").addEventListener("click", function(e){
      document.querySelector("#headers").appendChild(new HeaderInputs());
      addBlurToHeaderInputs();
      addChangeToHeaderCheckboxes();
      attachClickToHeaderDeletes();
    });
  }

  (() => {
    if(document.querySelector("#http-method")){
      if(localStorage.getItem("method")){
        document.querySelector("#http-method").value = localStorage.getItem("method");
        document.querySelector("#method").innerHTML=localStorage.getItem("method");
      }
    }
    if(document.querySelector("#message-body")){
      let body = localStorage.getItem("body");
      if(body){
        body = JSON.parse(body);
        document.querySelector("#message-body").value = body.v;
        document.querySelector("#include-body-cbx").checked = body.c;
      }
    }

    if(document.querySelector("#include-body-cbx")){
      document.querySelector("#include-body-cbx").addEventListener("change",function(){
        let o = {};
        o.c = document.querySelector("#include-body-cbx").checked;
        o.v = document.querySelector("#message-body").value;
        localStorage.setItem("body",JSON.stringify(o))
      })
    }

    if(document.querySelector("#basic-auth-cbx")){
      let basicAuthChecked = localStorage.getItem("basic-auth");
      if(basicAuthChecked){
        if(basicAuthChecked === "true"){
          document.querySelector("#basic-auth-cbx").checked = true;
        } else {
          document.querySelector("#basic-auth-cbx").checked = false;
        }
      }      
    }

    if(document.querySelector("#headers")){
      let storedHeaders = localStorage.getItem("headers");
      if(storedHeaders){
        storedHeaders = JSON.parse(storedHeaders);
        storedHeaders.forEach(function(header){
        let inputs = new HeaderInputs(header.k, header.v, header.c);
          document.querySelector("#headers").appendChild(inputs);
        });
        addBlurToHeaderInputs();
        addChangeToHeaderCheckboxes();
        attachClickToHeaderDeletes();
        addBlurToBodyInput()
      }
    }
  })();

  if (document.querySelector("#add-file")) { // if we are on app page read bucket
    let input = document.querySelector("#add-file");
    input.addEventListener('change', async function() {
      let formData = new FormData();
      Array.from(input.files).forEach(function(file, index) {
        //console.log(input.files[index].name, " ", input.files[index].size, " ", input.files[index].type)
        formData.append("file", input.files[index]);
      });
      let writeBucketResponse = await fetch(thisURL.origin + "/buckets", {
        method: "POST",
        body: formData
      });
      writeBucketResponse = await writeBucketResponse.json();
      if(writeBucketResponse["rev"]){
        document.querySelector("#bucket-output").dataset.rev = writeBucketResponse["rev"];
        document.querySelector("#bucket-output").dataset.id = writeBucketResponse["id"];
      }
      readBuckets();
    })
  }

  if(document.querySelector("#account")){
    document.querySelector("#account").addEventListener("click", function(e) {
      if (e.target.textContent === "Sign In") {
        document.querySelector("#authenticate").removeAttribute("hidden", "");
      } else {
        document.querySelector("#log-out").removeAttribute("hidden", "");
      }
      showDialog();
    })
  }

  if (document.querySelector("#auth-create-button")){
    document.querySelector("#auth-create-button").addEventListener("click", async function(e) {
      if (document.querySelector("#email").checkValidity()) {
        let body = {};
        body.action = "create";
        body.email = document.querySelector("#email").value;
        await fetch(thisURL.origin + "/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        closeDialog();
        toast("Email Sent");
      } else {
        document.querySelector("#email").reportValidity()
      }
    })
  }

  if(document.querySelector("#auth-delete-button")){
    document.querySelector("#auth-delete-button").addEventListener("click", async function(e) {
      let body = {};
      body.action = "delete";
      await fetch(thisURL.origin + "/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      closeDialog();
      readAuth();
      toast("Signed Out");
    })
  }

  if(document.querySelectorAll(".close-dialog-button")){
    document.querySelectorAll(".close-dialog-button").forEach(function(button) {
      button.addEventListener("click", function(e) {
        closeDialog();
      })
    })
  }

  if (document.querySelector("#header-logo")) {
    document.querySelector("#header-logo").addEventListener("click", function(e) {
      window.location.href = "/"
    })
  }

  function addBlurToBodyInput(){
    document.querySelector("#message-body").addEventListener("blur", function(){
      let o = {};
      o.c = document.querySelector("#include-body-cbx").checked;
      o.v = document.querySelector("#message-body").value;
      localStorage.setItem("body",JSON.stringify(o))
    })
  }

  function addBlurToHeaderInputs(){
    document.querySelectorAll("#headers input[type=text]").forEach(function(input){
      input.addEventListener("blur", function(e){
        let parent = e.target.parentElement.parentElement;
        let o = {};
        o.k = parent.querySelector(".key").value;
        o.v = parent.querySelector(".val").value;
        o.c = parent.querySelector("input[type=checkbox]").checked;
        let storedHeaders = localStorage.getItem("headers");
        if(storedHeaders){
          let headers = JSON.parse(storedHeaders);
          if (!headers.some(i => i.k === o.k)) { //if this header is NOT already stored
            headers.push(o);
            localStorage.setItem("headers",JSON.stringify(headers));
          } else {                               //       this header IS stored already
            let index = headers.findIndex(item => item.k === o.k);
            headers[index] = o;
            localStorage.setItem("headers",JSON.stringify(headers));
          }
        } else { //there were no stored headers
          let h = [];
          h.push(o);
          localStorage.setItem("headers",JSON.stringify(h));
        }
      })
    })
  }

  function addChangeToHeaderCheckboxes(){
    document.querySelectorAll("#headers input[type=checkbox]").forEach(function(cbx){
      cbx.addEventListener("change", function(e){
        let key = e.target.parentElement.querySelector(".key").value;
        let thisCbx = e.target;
        let storedHeaders = localStorage.getItem("headers");
        if(storedHeaders){
          let headers = JSON.parse(storedHeaders);
          headers.forEach(function(header,index){
            if(header.k === key){
              headers[index].c = thisCbx.checked;
            }
          })
          localStorage.setItem("headers",JSON.stringify(headers));
        }
      });
    });
  }

  async function afterAuth() {
    if (pub.user) {
      document.querySelector("#account").textContent = pub.user.email;
      if (document.querySelector("#bucket-section")) { // if buckets section fetch users bucket info
        document.querySelector("#add-file").hidden = false;
        await readBuckets();
      }
    } else {
      document.querySelector("#account").textContent = "Sign In";
      if (document.querySelector("#bucket-section")) {
        document.querySelector("#add-file").hidden = true;
        // document.querySelector("#bucket-output").innerHTML = "Sign in to access bucket."
      }
    }
  }

  function attachClickToBucketDeletes(){
    document.querySelectorAll("#bucket-output .delete").forEach(function (svg){
      svg.addEventListener("click", async function(e) {
        let rev = document.querySelector("#bucket-output").dataset.rev;
        let name = e.target.dataset.name;
        let path = e.target.dataset.href + "?rev=" + rev
        console.log(path)
        let deleteAttachmentResponse = await fetch(path, {
          method: "DELETE"
        });
        deleteAttachmentResponse = await deleteAttachmentResponse.json();
        if(deleteAttachmentResponse.ok){
          document.querySelector("#bucket-output").dataset.rev = deleteAttachmentResponse.rev;
          document.querySelector(`[data-name='${name}']`).parentElement.remove();
          toast("File Deleted");
        }
      })
    })
  }

  function attachClickToHeaderDeletes(){
    document.querySelectorAll("#headers .delete").forEach(function (svg){
      svg.addEventListener("click", function(e) {
        let thisDiv = e.target.parentElement;
        let fieldset = thisDiv.parentElement;
        let k = thisDiv.querySelector(".key").value;
        let v = thisDiv.querySelector(".val").value;
        let headers = localStorage.getItem("headers");
        headers = JSON.parse(headers);
        headers = headers.filter(function( obj ) {
          return obj.k !== k;
        });
        localStorage.setItem("headers",JSON.stringify(headers));
        if(fieldset){
          fieldset.querySelectorAll("div").forEach(function(div,index){
            if(div.querySelector(".key")){
              if(div.querySelector(".key").value === k){
                div.remove();
              }
            }
          });
        }
      });   
    })
  }

  async function call(add, options) {
    jsonData = null;
    try {
      let response = await fetch(add, options);
      jsonData = await response.json();
    } finally {
      return jsonData;
    }
  }

  function closeDialog() {
    document.querySelectorAll("dialog > section").forEach(function(section) {
      section.setAttribute("hidden", "");
    })
    document.querySelector("dialog").style.display = "none";
    document.querySelector("dialog").close();
  }

  function couchLinkClick(e){
    let path = e.target.textContent;
    let address = document.querySelector("#url").value || "http://localhost";
    let url = new URL(address);
    let base = url.href.replace(url.pathname,"");
    let newUrl = base + path;
    document.querySelector("#url").value = newUrl;
    document.querySelector("#path").textContent = path;
  }

  async function fetchFunction(e){
    let method = e.target.textContent || "GET";
    let add = document.querySelector("#url").value.toLowerCase();
    document.querySelector("#method").innerHTML=method;
    let username = document.querySelector("#username").value;
    let password = document.querySelector("#password").value;
    resetResultValues();
    let initOptions={};
    let headers={}
    // we need to iterate each header pair IF checked push to header array then append to options
    document.querySelectorAll("#headers div").forEach(function(div){
      if(div.querySelector("input[type=checkbox]")){
        if(div.querySelector("input[type=checkbox]").checked){
          let k = div.querySelector(".key").value;
          let v = div.querySelector(".val").value;
          headers[k] = v;     
        }     
      }
    })
    if(document.querySelector("#basic-auth-cbx")){
      if(document.querySelector("#basic-auth-cbx").checked){
        headers["Authorization"] = "Basic " + btoa(username + ":" + password);
      }
    }
    if(document.querySelector("#include-body-cbx")){
      if(document.querySelector("#include-body-cbx").checked){
        initOptions["body"] = document.querySelector("#message-body").value;
        headers["Content-Type"] = document.querySelector("#mime-type").value;
      }
    }
    if(!add){
      add = document.querySelector("#url").getAttribute("placeholder");
    }
    if(!add.toLowerCase().startsWith('http')){
      add = 'http://' + add;
    }
    initOptions['method']=method;
    initOptions['headers']=headers;
    try {
      let response = await fetch(add,initOptions);
      response.headers.forEach(function(k,v){
        let t = document.createTextNode(v.trim() + ": " + k.trim());
        let br = document.createElement("br");
        responseHeaders.appendChild(t);
        responseHeaders.appendChild(br);
      })
      let responseOK = "";
      if(response.ok){
        responseOK = "OK";
      }
      let responseHeadingText = document.createTextNode(protocol + " " + response.status + " " + responseOK)
      responseHeading.appendChild(responseHeadingText);
      // let res = await response;
      try {
        let jsonData = await response.json();
        jsonData = JSON.stringify(jsonData, null, 2)
        responseBodyOutput.innerHTML = jsonData;
      } catch {
        let txt = await response.text()
        responseBodyOutput.innerHTML = txt
      }
    } catch (error) {
      responseBodyOutput.innerHTML = JSON.stringify(error, null, 2);
    }
  }

  function fireToast() {
    document.querySelector(".toast").classList.remove("show-toast");
  }

  function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
  }

  function getCookies() {
    let cookie = document.cookie;
    if (cookie) {
      cookie = cookie.split("; ");
      let obj = {};
      cookie.forEach((item, index) => {
        let i = item.split("=");
        obj[i[0]] = i[1];
      });
      return obj;
    }
    return cookie;
  }

  async function readAuth() {
    let body = {};
    body.action = "read";
    let cookies = getCookies();
    if (cookies.authentication) {
      try {
        pub.user = await call(thisURL.origin + "/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
      } finally {
        if (pub.user) {
          if (!pub.user.email) {
            delete pub.user;
          }
        } else {
          delete pub.user;
        }
      }
    } else {
      delete pub.user;
    }
    afterAuth();
  }

  async function readBuckets() {
    let body = {};
    body.action = "read";
    let res = await call(thisURL.origin + "/buckets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if(res){
      if(res["_attachments"]){
        let attachments = Object.keys(res["_attachments"]);
        document.querySelector("#bucket-output").innerHTML = "";
        document.querySelector("#bucket-output").dataset.id = res["_id"];
        attachments.forEach(function(attachment) {
          let fileLength = res["_attachments"][attachment]["length"];
          let fileElement = new FileElement(res["_id"], attachment, fileLength);
          document.querySelector("#bucket-output").dataset.rev = res["_rev"];
          document.querySelector("#bucket-output").appendChild(fileElement);
        })
        attachClickToBucketDeletes();
      }      
    }
  }
  function resetResultValues(){
    responseBodyOutput.innerHTML="";
    responseHeaders.innerHTML="";
    responseHeading.innerHTML="";
  }
  function showDialog() {
    document.querySelector("dialog").style.display = "block";
    document.querySelector("dialog").showModal()
  }

  function toast(msg) {
    document.querySelector(".toast > span").textContent = msg;
    document.querySelector(".toast").classList.add("show-toast");
    return setTimeout(fireToast, 3000);
  }

  document.onkeydown = function(evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) {
      isEscape = (evt.key === "Escape" || evt.key === "Esc");
    } else {
      isEscape = (evt.keyCode === 27);
    }
    if (isEscape) {
      if (document.querySelector("dialog")) {
        closeDialog();
      }
    }
  }

  return pub; // Expose API
}());