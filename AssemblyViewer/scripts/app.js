//parameters
//HTML parameters: modelId, projectId, accessToken

let odooParts = [];
let odooRebar = [];

//#region UI
$("#btnFrontView").dxButton({
  stylingMode: "contained",
  text: "VA",
  type: "success",
  onClick: async function (data) {
    setCamera('front');
    //set zoom to fit ratio??
  },
});

$("#btnLeftView").dxButton({
  stylingMode: "contained",
  text: "LZA",
  type: "danger",
  onClick: async function (data) {
    setCamera('left');
  },
});

$("#btnRightView").dxButton({
  stylingMode: "contained",
  text: "RZA",
  type: "danger",
  onClick: async function (data) {
    setCamera('right');
  },
});

$("#btnBackView").dxButton({
  stylingMode: "contained",
  text: "AA",
  type: "success",
  onClick: async function (data) {
    setCamera('back');
  },
});

$("#btnBottomView").dxButton({
  stylingMode: "contained",
  text: "OA",
  type: "default",
  onClick: async function (data) {
    setCamera('bottom');
  },
});

$("#btnTopView").dxButton({
  stylingMode: "contained",
  text: "BA",
  type: "default",
  onClick: async function (data) {
    setCamera('top');
  },
});

$('#sbRoles').dxSelectBox({
  items: ["Algemeen", "Beton", "Wapening"],
  inputAttr: { 'aria-label': 'Select role' },
  width: "100px",
  onValueChanged: async function(data) {
    if(data.value) {
      await updateUi(data.value);
    }
  },
});

let concreteObjects;
async function updateUi(role){
  let elementPieces = document.getElementsByClassName("div-pieces")[0];
  let elementRebar = document.getElementsByClassName("div-rebar")[0];
  for(let element of [elementPieces, elementRebar]){
    element.classList.remove("div-lists-general");
    element.classList.remove("div-lists-specific");
    element.classList.remove("visible");
  }
  //if(!concreteObjects){
    concreteObjects = [];
    let selectorConcreteObjects = { parameter: { properties: { "Default.OBJECT_TYPE": "PART" } } };
    console.log(selectorConcreteObjects);
    let allConcreteObjects = await API.viewer.getObjects(selectorConcreteObjects);
    for (const mobjects of allConcreteObjects) {
      let modelId = mobjects.modelId;
      const objectsRuntimeIds = mobjects.objects.map(o => o.id);
      if (objectsRuntimeIds.length == 0)
          continue;
      const objectPropertiesArr = await API.viewer.getObjectProperties(modelId, objectsRuntimeIds);
      let objectsRuntimeIdsConcrete = [];
      for (const objproperties of objectPropertiesArr) {
          const material = objproperties.properties.flatMap(p => p.properties).find(p => p.name === "MATERIAAL_TYPE");
          if (material && material.value === "CONCRETE") {
            objectsRuntimeIdsConcrete.push(objproperties.id);
          }
      }
      if(objectsRuntimeIdsConcrete.length > 0){
        concreteObjects.push({modelId: modelId, objectRuntimeIds: objectsRuntimeIdsConcrete});
      }
      //console.log(objectsRuntimeIdsToColor);
      //if (objectsRuntimeIdsToColor.length > 0)
          //await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIdsToColor }] }, { color: { r: 255, g: 0, b: 0 }, visible: true });
    }
    console.log("concreteObjects");
    console.log(concreteObjects);
  //}
  if(role === "Algemeen") {
    elementPieces.classList.add("div-lists-general");
    elementRebar.classList.add("div-lists-general");
    //show all
    await API.viewer.setObjectState({ modelObjectIds: concreteObjects }, { visible: true });
    //await API.viewer.setSelection({modelObjectIds: concreteObjects , mode: "set"});
  }
  else if(role === "Beton") {
    elementPieces.classList.add("div-lists-specific");
    elementRebar.classList.add("visible");
    //show all
    await API.viewer.setObjectState({ modelObjectIds: concreteObjects }, { visible: true });
  }
  else if(role === "Wapening") {
    elementRebar.classList.add("div-lists-specific");
    elementPieces.classList.add("visible");
    //hide concrete elements and toggle ghost mode
    await API.viewer.setObjectState({ modelObjectIds: concreteObjects }, { visible: false });
  }
}

$("#btnPiecesToggleFullscreen").dxButton({
  stylingMode: "outlined",
  text: "Toggle Pieces Fullscreen",
  type: "success",
  onClick: function () {
    //let elements = document.getElementsByClassName("hideOnfullScreen");
    var elements = document.querySelectorAll(".hideOnfullScreen, .div-rebar");
    for(let element of elements){
      element.classList.toggle("visible");
    }
    elements = document.getElementsByClassName("lists");
    for(let element of elements){
      element.classList.toggle("listContainerSidepanel");
    }
    dataGridRebar.updateDimensions();
    treelistPieces.dxTreeList("refresh");//.dxTreeList("updateDimensions");
  },
});

$("#btnRebarToggleFullscreen").dxButton({
  stylingMode: "outlined",
  text: "Toggle Rebar Fullscreen",
  type: "success",
  onClick: function () {
    //let elements = document.getElementsByClassName("hideOnfullScreen");
    var elements = document.querySelectorAll(".hideOnfullScreen, .div-pieces");
    for(let element of elements){
      element.classList.toggle("visible");
    }
    elements = document.getElementsByClassName("lists");
    for(let element of elements){
      element.classList.toggle("listContainerSidepanel");
    }
    dataGridRebar.updateDimensions();
    treelistPieces.dxTreeList("refresh");//.dxTreeList("updateDimensions");
  },
});

let treelistPieces = $('#pieces').dxTreeList({
  dataSource: odooParts,
  rootValue: -1,
  keyExpr: 'OdooId',
  parentIdExpr: "OdooParentId",
  //parentIdExpr: 'Head_ID',
  columns: [{
    dataField: 'Position',
    caption: 'Naam',
  },{
    dataField: 'Quantity',
    caption: 'Aantal',
  },{
    dataField: 'Material',
    caption: 'Materiaal',
  },{
    type: "buttons",
    buttons: [{
        name: "save",
        cssClass: "my-class"
    }]
  }],
  //expandedRowKeys: [2],
  autoExpandAll: true,
  showRowLines: true,
  showBorders: true,
  columnAutoWidth: true,
  focusedRowEnabled: true,
  onFocusedRowChanged: async function(e) {
    const rowData = e.row && e.row.data;
    let cellValue;

    if (rowData) {
      cellValue = e.component.cellValue(e.row.rowIndex, 'Position');
      let selector;
      if(cellValue.startsWith("W_")){
        selector = { parameter: { properties: { "Default.ONDERDEEL_POSITIENUMMER": cellValue } } };
      }
      else{
        selector = { parameter: { properties: { "Default.MERKNUMMER": cellValue}} };
      }
      await API.viewer.setSelection(selector, "set")
      console.log(cellValue);
    }
  },
});

let clearSelectionButton;
var dataGridRebar = $("#rebar").dxDataGrid({
  dataSource: odooRebar,
  keyExpr: 'OdooId',
  showBorders: true,
  paging: {
      pageSize: 10, //ToDo: pagesize in functie van toestel (schermgrootte) => screenHeight/rowHeight oid?
  },
  rowAlternationEnabled: true,
  selection: {
      mode: 'multiple',
  },
  pager: {
    visible: true,
    allowedPageSizes: [5, 10, 20, 'all'],
    showPageSizeSelector: true,
    showInfo: true,
    showNavigationButtons: true,
  },
  toolbar: {
    items: [{
      widget: 'dxButton',
      location: 'before',
      options: {
        text: 'Clear Selection',
        disabled: true,
        onInitialized(e) {
          clearSelectionButton = e.component;
        },
        onClick: async function() {
          dataGridRebar.clearSelection();
          await API.viewer.setSelection(undefined, 'remove');
        },
      },
    }],
  },
  columns: [
    {
      dataField: 'Position',
      caption: 'Nummer',
      dataType: 'number',
      format: {
          type: "fixedPoint",
          precision: 0
      },
    }, {
      dataField: 'Type',
      caption: 'Type',
      cssClass: "last-column"
    }
  ],
  onSelectionChanged: async function(e) {
    var positionNumbers = [];
    for(let row of e.selectedRowsData){
      positionNumbers.push(row.Position)
    }
    console.log(positionNumbers);
    if (positionNumbers.length > 0) {
      selector = { parameter: { properties: { "Default.WAPENING_POSITIENUMMER": positionNumbers } } };
      await API.viewer.setSelection(selector, "set")
      console.log(selector);
    }
    clearSelectionButton.option('disabled', !e.selectedRowsData.length);
  },
}).dxDataGrid('instance');
//#endregion

//#region trimble connect
let API;
window.onload = async function () {
  API = await TrimbleConnectWorkspace.connect(document.getElementById("viewer"), 
    (event, args) => {
      console.log(event, args);
    }
  );
  let params = new URL(document.location).searchParams;
  //loadDummyData();
  let odoo_mark_id = params.get("odooMarkId");
  await Promise.allSettled([await setViewerSettings(), await refreshPieces(odoo_mark_id), await refreshRebar(odoo_mark_id)]);
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
  //await API.ui.setUI({ name: "SidePanel", state: "hidden" });
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