//parameters
//HTML parameters: modelId, projectId, accessToken

let odooParts = [];
let odooRebar = [];

//#region trimble connect
let API;
window.onload = async function () {
  API = await TrimbleConnectWorkspace.connect(document.getElementById("viewer"), 
    (event, args) => {
      console.log(event, args);
    }
  );
  await Promise.allSettled([await setViewerSettings()]);
}

async function setViewerSettings(){
  let params = new URL(document.location).searchParams;
  let access_token_input = params.get("accessToken");
  let projectId = params.get("projectId");
  let modelId = params.get("modelId");
  //console.log(access_token_input);
  await API.embed.setTokens({accessToken: access_token_input}); 
  // (or) await API.embed.setTokens({shareToken: "shareToken_here"});
  await API.embed.init3DViewer({projectId: projectId, modelId: modelId}); 
  // (or) 
  //await API.embed.init3DViewer({}); // if you want to select a project from the list
  await API.ui.setUI({ name: "SidePanel", state: "hidden" });
  //await API.ui.setUI({ name: "MainToolbar", state: "hidden" });
  await API.viewer.setSettings({assemblySelection: false}); //zoom to fit ratio has no effect?
  const currentCamera = await API.viewer.getCamera();
  currentCamera.projectionType = "ortho";
  await API.view.setView({ camera: currentCamera});
  //await API.ui.setUI({ name: "DetailsPanel.Clashes", state: "hidden" }); //werkt niet deftig
  //await API.ui.setUI({ name: "DetailsPanel.ToDos", state: "hidden" });//werkt niet deftig
  //await API.ui.setUI({ name: "DetailsPanel.Views", state: "visible" });//werkt niet deftig
}

async function doWorkRes(selResult, selLoading, action) {
  return doWorkSafe(() => {
    $(selResult).html("");
    $(selLoading).show();
  }, action, r => {
    $(selLoading).hide();
    $(selResult).html(r);
  });
}

async function doWorkSafe(preAction, action, postAction) {
  preAction();
  let result;
  try {
    const actionRes = await action();
    if (actionRes === false) {
    throw new Error("Operation failed: Unknown error");
    } else if (actionRes === true || actionRes === "" || actionRes == null) {
    result = ok();
    } else {
    result = actionRes;
    }
    err("test");
  }
  catch (e) {
    result = err(e);
  }
  postAction(result)
}

async function doCamera(action) {
    return doWorkRes("#cameraResult", "#cameraLoading", action);
}

function setCamera(preset) {
    return doCamera(async () => API.viewer.setCamera(preset));
}

const dismissBtn = `<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;
const str = (msg) => document.createTextNode(msg).data;
const ok = (msg) => `<div class="alert alert-success alert-dismissible fade show" role="alert">${str(msg ? msg + ": " : "")} Successful${dismissBtn}</div>`;
const warn = (msg) => `<div class="alert alert-warning alert-dismissible fade show" role="alert">${str(msg)}${dismissBtn}</div>`;
const err = (err) => `<div class="alert alert-danger alert-dismissible fade show" role="alert">${str(err)}${dismissBtn}</div>`;

//#endregion