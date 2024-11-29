var API = null;
var odooURL = "https://odoo.valcke-prefab.be"; //no slash at the end
var odooDatabase = "erp_prd"
var fetchLimit = 60; 

window.onload = async function () {
    API = await TrimbleConnectWorkspace.connect(window.parent, async (event, data) => {
        //console.log("Event: ", event, data);

        var eventName = event.split(".").pop();

        if (eventName === "onSelectionChanged") {
            await selectionChanged(data.data);
        }
    }, 3e4);
}

var odooUsernameTextbox = $('#placeholderOdooUsername').dxTextBox({
    placeholder: "Odoo gebruikersnaam, bvb. jmasson",
    inputAttr: {
        autocomplete: 'on',
        name: 'username'
    }
});

var odooPasswordTextbox = $('#placeholderOdooPassword').dxTextBox({
    mode: 'password',
    placeholder: "Odoo paswoord (idem paswoord computer)",
    inputAttr: {
        autocomplete: 'on',
        name: 'password'
    }
});

$('#btnOdooLogin').dxButton({
    stylingMode: "outlined",
    text: "Log in", 
    type: "success",
    onClick: async function (data) {
        if(await tryOdooLogin())
        {
            var montageDiv = document.getElementById("montageDiv");
            montageDiv.style.display = "block";
        }
    },
});

$('#btnRefresh').dxButton({
    stylingMode: "outlined",
    text: "Vernieuwen", 
    type: "success",
    onClick: async function (data) {
        try {
            //Authenticate with MUK API
            var token = await getToken();

            //Get project name
            var projectNumber = await getProjectNumber();

            //Get project ID
            var projectId = await GetProjectId(projectNumber);
            
            var domainTrimbleConnectMain = `[["project_id", "=", ${projectId}], ["date_erected","=", false], ["date_transported","!=", false]]`;

            var elementsToAdd = [];
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "trimble.connect.main",
                    domain: domainTrimbleConnectMain,
                    fields: '["id", "name"]',
                },
                success: function (odooData) {
                    for (var record of odooData) {
                        elementsToAdd.push({
                            Guid: record.name,
                            SelectedInModel: false,
                            OdooTcmId: -1,
                            Origin: "odoo",
                        });
                    }
                }
            });

            await SetModelInfo(elementsToAdd);
            await SetOdooData(elementsToAdd);
            
            var listObjectsFromModel = listObjects.filter(o => o.SelectedInModel && elementsToAdd.find(x => x.Guid === o.Guid) == undefined);
            listObjects.length = 0;
            listObjects.push(...listObjectsFromModel.filter(o => o.OdooTcmId != -1).sort(function (a, b)  { compareElements(a, b) } ));
            listObjects.push(...elementsToAdd.sort(function (a, b)  { compareElements(a, b) } ));
            console.log(listObjects);
            dataGridMontage.dxDataGrid("refresh");
        }
        catch (e) {
            DevExpress.ui.notify(e, "info", 5000);
        }
    },
});

async function SetErectionDate(element)
{
    try {
        //Authenticate with MUK API
        var token = await getToken();

        var dateString = false;
        if(element.DateErected)
            dateString = getShortStringFromDate(element.DateErected);
        console.log("setting date:")
        console.log(dateString);
        console.log(element);
        var success = false;
        var valuesStr = "";
        var elementColor;
        if(dateString)
        {
            valuesStr = '{"date_erected": "' + dateString + '"}';
            elementColor = { r: 255, g: 0, b: 255, a: 255 };
        }
        else
        {
            valuesStr = '{"date_erected": false }';
            elementColor = { r: 34, g: 177, b: 76, a: 255 };
        }
        await $.ajax({
            type: "PUT",
            url: odooURL + "/api/v1/write",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                ids: "[" + element.OdooTcmId + "]",
                values: valuesStr,
            },
            success: function (odooData) {
                console.log("success");
                console.log(odooData);
                success = true;
            },
            fail: function(jqXHR, textStatus, errorThrown){
                //console.log(jqXHR);
                //console.log(textStatus);
                console.log(errorThrown);
            }
        });
        
        if(success)
        {
            var modelId = element.ModelId;
            var objectRuntimeId = element.ObjectRuntimeId;
            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: [objectRuntimeId] }] }, { color: elementColor });
        }
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
    }
}

function getShortStringFromDate(d) {
    console.log(d);
    var year = d.getFullYear();
    var month = pad("00", d.getMonth() + 1);
    var day = pad("00", d.getDate());
    var returnstr = year + "-" + month + "-" + day;
    return returnstr;
}

function pad(pad, str) {
    if (typeof str === 'undefined')
        return pad;
    return (pad + str).slice(-pad.length);
}

async function tryOdooLogin()
{
    var success = false;
    access_token = "";
    refresh_token = "";
    access_token_expiretime = -1;
    try
    {
        var token = await getToken();
        if(token !== "")
        {
            await setAccesBooleans();
            if(!hasAccesToTransport)
            {
                DevExpress.ui.notify(e, "Deze gebruiker heeft geen toegang tot de transportgegevens.", 5000);
            }
            else
            {
                success = true;
            }
        }
        else
        {
            DevExpress.ui.notify(e, "Kon geen verbinding maken met Odoo.", 5000);
        }
    }
    catch (e) {
        console.log(e);
        console.log(e.toString());
        DevExpress.ui.notify("Kon niet inloggen. Controleer verbinding met Odoo en gebruikersnaam+paswoord", "info", 5000);
    }
    return success;
}

var access_token = "";
var refresh_token = "";
var access_token_expiretime;
var client_id = "3oVDFZt2EVPhAOfQRgsRDYI9pIcdcdTGYR7rUSST";
var client_secret = "PXthv4zShfW5NORk4bKFgr6O1dlYTxqD8KwFlx1S";
async function getToken() {
    checkUsernameAndPassword();

    var username = odooUsernameTextbox.dxTextBox("instance").option("value");
    var password = odooPasswordTextbox.dxTextBox("instance").option("value");

    if (refresh_token !== "" && access_token_expiretime != undefined && access_token_expiretime.getTime() < Date.now() + 60 * 1000) {
        var refreshSuccesful = false;
        await $.ajax({
            type: "POST",
            url: odooURL + "/api/v1/authentication/oauth2/token",
            data: {
                client_id: client_id,
                client_secret: client_secret,
                grant_type: "refresh_token",
                refresh_token: refresh_token
            },
            success: function (odooData) {
                access_token = odooData.access_token;
                refresh_token = odooData.refresh_token;
                access_token_expiretime = new Date(Date.now() + odooData.expires_in * 1000);
                refreshSuccesful = true;
            },
        });
        if (!refreshSuccesful) {
            access_token = "";
            refresh_token = "";
            access_token_expiretime = undefined;
        }
    }
    if (access_token === "") {
        await $.ajax({
            type: "POST",
            url: odooURL + "/api/v1/authentication/oauth2/token",
            data: {
                db: odooDatabase,
                username: username,
                password: password,
                client_id: client_id,
                client_secret: client_secret,
                grant_type: "password"
            },
            success: function (data) {
                access_token = data.access_token;
                refresh_token = data.refresh_token;
                access_token_expiretime = new Date(Date.now() + data.expires_in * 1000);
            }
        });
    }
    return access_token;
}

function getDateFromString(s) {
    var date = null;
    var resultDate = s.match(regexDate);
    if (resultDate != null) {
        var splitDate = resultDate[0].split("-");
        var year = splitDate[0];
        var month = splitDate[1];
        var day = splitDate[2];
        date = new Date(year, month - 1, day);
    }
    return date;
}

var regexDate = /[0-9]{4}-[0-9]{2}-[0-9]{2}/;
var regexDateAndTime = /[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/;
var datePicker = $('#date').dxDateBox({
    calendarOptions: { firstDayOfWeek: 1 },
    type: 'date',
    label: "dag/maand/jaar",
    displayFormat: 'dd/MM/yyyy',
    value: Date.now(),
});

async function setAccesBooleans() {
    try {
        var token = await getToken();

        var canReadSlips = false;
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "vpb.delivery.slip",
                domain: '[["id", ">", "-1"]]',
                limit: 1,
                fields: '["id"]'
            },
            success: function () {
                canReadSlips = true;
            }
        });

        var canReadSliplines = false;
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "vpb.delivery.slip.line",
                domain: '[["id", ">", "-1"]]',
                limit: 1,
                fields: '["id"]'
            },
            success: function () {
                canReadSliplines = true;
            }
        });

        if (canReadSlips && canReadSliplines) {
            hasAccesToTransport = true;
        }
    }
    catch (ex) {
        console.log("No access to transport data.");
    }
}

async function getProjectNumber() {
    //Get project name
    var regexProjectName = /^[TV]\d+_\w+/;
    var project = await API.project.getProject();
    if (!regexProjectName.test(project.name))
        return undefined;
    else
        return project.name.split("_")[0];
}

var projectId = -1;
async function GetProjectId(projectNumber) {
    if (projectId == -1) {
        var id = -1;
        //console.log("Start get project Id");
        //console.log("Odoo URL: " + odooURL + "/api/v1/search_read");
        //console.log("using token: " + token);

        //Authenticate with MUK API
        var token = await getToken();

        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "project.project",
                domain: '["&", "|", ["active","=",True], ["active","=",False], ["project_identifier", "=", "' + projectNumber + '"]]',
                fields: '["id", "project_identifier"]',
            },
            success: function (data) {
                //console.log(data);
                id = data[0].id;
                projectId = id;
            }
        });
        //console.log("End get project Id");
    }

    return projectId;
}

//variable to prevent selection changed event from doing its queries again after selection erection arrows
var performSelectionChanged = true;
var hasAccesToTransport = false;
var selectionChangedIds = [];
var listObjects = [];
var lastSelectionId = -1;
async function selectionChanged(data) {
    if (!hasAccesToTransport)
        return;

    try {
        await checkAssemblySelection();
    }
    catch (e) {
        DevExpress.ui.notify(e, "info", 5000);
    }

    var mySelectionId = ++lastSelectionId;
    selectionChangedIds.push(mySelectionId);
    if (!performSelectionChanged) {
        return;
    }
    if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) {
        return;
    }

    var tempSelectedObjects = [];
    try {
        //Odoo objecten die nu al in de lijst zitten behouden
        var listObjectsFromOdoo = listObjects.filter(o => o.Origin === "odoo");

        for (const mobjects of data) {
            var modelId = mobjects.modelId;
            const objectsRuntimeIds = mobjects.objectRuntimeIds;
            if (objectsRuntimeIds.length == 0)
                continue;
            const objectIds = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds);
            for (var i = 0; i < objectsRuntimeIds.length; i++) {
                var guid = Guid.fromCompressedToFull(objectIds[i]);
                var objectFromOdoo = listObjectsFromOdoo.find(o => o.Guid === guid);
                if(objectFromOdoo != undefined)
                {
                    objectFromOdoo.SelectedInModel = true;
                }
                else
                {
                    tempSelectedObjects.push({
                        ModelId: modelId,
                        ObjectRuntimeId: objectsRuntimeIds[i],
                        ObjectId: objectIds[i],
                        Guid: Guid.fromCompressedToFull(objectIds[i]),
                        OdooTcmId: -1,
                        OdooPmmId: -1,
                        Rank: 0,
                        OdooCode: "",
                        DateTransported: false,
                        DateErected: false,
                        AvailableForTransport: false,
                        Prefix: "",
                        PosNmbr: 0,
                        AssemblyName: "",
                        OdooSlipId: -1,
                        SlipName: "",
                        SelectedInModel: true,
                        Origin: "model"
                    });
                }
            }
        }

        await SetOdooData(tempSelectedObjects, mySelectionId);
        //ids van geselecteerde objecten
        var selectedOdooTcmIds = tempSelectedObjects.map(o => o.OdooTcmId);

        //om onnodige code executions te onderbreken
        if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
        listObjects.length = 0;
        listObjects.push(...tempSelectedObjects.filter(o => o.OdooTcmId != -1).sort(function (a, b)  { compareElements(a, b) } ));
        listObjects.push(...listObjectsFromOdoo.sort(function (a, b)  { compareElements(a, b) } ));
        console.log(listObjects);
        var dataGrid = dataGridMontage.dxDataGrid("instance");
        dataGrid.refresh();
        selectedOdooTcmIds.push(...listObjects.filter(o => o.SelectedInModel).map(o => o.OdooTcmId));
        selectedOdooTcmIds = [...new Set(selectedOdooTcmIds)];//unique values
        dataGrid.selectRows(selectedOdooTcmIds, false);
    }
    catch (e) {
        console.log(e);
    }
    performSelectionChanged = true;
}

async function SetOdooData(tempSelectedObjects, mySelectionId = false)
{
    //Get project name
    var projectNumber = await getProjectNumber();
    if (projectNumber == undefined)
        return;

    //Authenticate with MUK API
    var token = await getToken();

    //Get project ID
    var projectId = await GetProjectId(projectNumber);

    for (var i = 0; i < tempSelectedObjects.length; i += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
        if (mySelectionId && selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId){
            return;
        }
        var domainTrimbleConnectMain = "";

        for (var j = i; j < tempSelectedObjects.length && j < i + fetchLimit; j++) {
            var filterArrStr = '["name", "ilike", "' + tempSelectedObjects[j].Guid + '"]';
            if (j > i) {
                domainTrimbleConnectMain = '"|", ' + filterArrStr + ',' + domainTrimbleConnectMain;
            }
            else {
                domainTrimbleConnectMain = filterArrStr;
            }
        }
        //adding project_id to the query reduces the time it takes to find the records
        //based on seeing how fast the grid refreshes with and w/o project_id, should properly time the difference to verify.
        //should also try this with other queries that use ilike
        domainTrimbleConnectMain = '[["project_id", "=", ' + projectId + '],' + domainTrimbleConnectMain + "]";
        var domainProjectMarks = "";
        var recordsAdded = 0;
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: domainTrimbleConnectMain,
                fields: '["id", "mark_id", "name", "rank", "date_transported", "date_erected"]',
            },
            success: function (odooData) {
                var cntr = 0;
                for (var record of odooData) {
                    var filterArrStr = '["id", "=", "' + record.mark_id[0] + '"]';
                    if (cntr > 0) {
                        domainProjectMarks = '"|", ' + filterArrStr + ',' + domainProjectMarks;
                    }
                    else {
                        domainProjectMarks = filterArrStr;
                    }
                    var selectedObject = tempSelectedObjects.find(x => x.Guid === record.name);
                    if (selectedObject != undefined) {
                        selectedObject.OdooTcmId = record.id;
                        selectedObject.OdooPmmId = record.mark_id[0];
                        selectedObject.Rank = record.rank;
                        selectedObject.OdooCode = record.mark_id[1];
                        selectedObject.DateTransported = record.date_transported;
                        selectedObject.DateErected = record.date_erected;
                    }
                    cntr++;
                    recordsAdded++;
                }
                //don't think project_id would make this query faster since it's an exact id is given
                domainProjectMarks = "[" + domainProjectMarks + "]";
            }
        });
        if (recordsAdded > 0) {
            await $.ajax({
                type: "GET",
                url: odooURL + "/api/v1/search_read",
                headers: { "Authorization": "Bearer " + token },
                data: {
                    model: "project.master_marks",
                    domain: domainProjectMarks,
                    fields: '["id", "mark_ranking", "mark_prefix"]',
                },
                success: function (odooData) {
                    for (var record of odooData) {
                        var objects = tempSelectedObjects.filter(x => x.OdooPmmId == record.id);
                        for (var object of objects) {
                            object.Prefix = record.mark_prefix;
                            object.PosNmbr = record.mark_ranking;
                            object.AssemblyName = record.mark_prefix + record.mark_ranking + "." + object.Rank;
                        }
                    }
                }
            });

            if (hasAccesToTransport) {
                var transportedObjects = tempSelectedObjects;
                for (var k = 0; k < transportedObjects.length; k += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
                    var domainSliplines = "";

                    for (var l = k; l < transportedObjects.length && l < k + fetchLimit; l++) {
                        var filterArrStr = `["trimble_connect_id.id", "=", "${transportedObjects[l].OdooTcmId}"]`;
                        if (l > k) {
                            domainSliplines = '"|", ' + filterArrStr + ',' + domainSliplines;
                        }
                        else {
                            domainSliplines = filterArrStr;
                        }
                    }
                    domainSliplines = `[["trimble_connect_id.project_id", "=", ${projectId}],["slip_id.state", "!=", "cancel"],${domainSliplines}]`;

                    await $.ajax({
                        type: "GET",
                        url: odooURL + "/api/v1/search_read",
                        headers: { "Authorization": "Bearer " + token },
                        data: {
                            model: "vpb.delivery.slip.line",
                            domain: domainSliplines,
                            fields: '["id", "slip_id", "trimble_connect_id", "name"]',
                        },
                        success: function (odooData) {
                            for (var record of odooData) {
                                var object = tempSelectedObjects.find(x => x.OdooTcmId == record.trimble_connect_id[0]);
                                if (object != undefined) {
                                    object.OdooSlipId = record.slip_id[0];
                                    object.SlipName = record.slip_id[1];
                                }
                            }
                        }
                    });
                }
            }
        }
        else {
            //console.log("no records found in trimble.connect.main");
        }
    }
}

async function SetModelInfo(elements) {
    var models = await API.viewer.getModels("loaded");
    for (var element of elements) {
        var guid = element.Guid;
        if(guid == undefined && guid === "")
            continue;
        var compressedGuid = Guid.fromFullToCompressed(guid);

        for (var model of models) {
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(model.id, [compressedGuid]);
            if (runtimeIds == undefined || runtimeIds.length == 0)
                continue;
            element.ModelId = model.id;
            element.ObjectRuntimeId = runtimeIds[0];
            element.ObjectId = compressedGuid;
        }
    }
}

function compareStrings(a, b)
{
    if (a < b)
        return -1;
    else if (a > b)
        return 1;
    else
        return 0;
}

function compareNumbers(a, b)
{
    return a - b;
}

function compareElements(elementA, elementB)
{
    const slipNameA = elementA.SlipName;
    const slipNameB = elementB.SlipName;
    var slipNameComparison = compareStrings(slipNameA, slipNameB);
    if(slipNameComparison != 0)
        return slipNameComparison;

    const prefixA = elementA.Prefix;
    const prefixB = elementB.Prefix;
    var prefixComparison = compareStrings(prefixA, prefixB);
    if(prefixComparison != 0)
        return prefixComparison;

    const posNmbrA = elementA.PosNmbr;
    const posNmbrB = elementB.PosNmbr;
    var posNmbrComparison = compareNumbers(posNmbrA, posNmbrB);
    if(posNmbrComparison != 0)
        return posNmbrComparison;

    const rankA = elementA.Rank;
    const rankB = elementB.Rank;
    var rankComparison = compareNumbers(rankA, rankB);
    return rankComparison;
}

async function checkAssemblySelection() {
    const settings = await API.viewer.getSettings();
    if (!settings.assemblySelection) {
        throw new Error("Gebruik assembly selectie (zie linksboven, vierkant met kleinere vierkantjes in de hoeken)");
    }
}

async function selectGuids(guids) {
    var validGuids = guids.filter(x => x != undefined && x !== "");
    if (validGuids.length == 0) {
        await API.viewer.setSelection(undefined, 'remove');
    }
    else {
        var models = await API.viewer.getModels("loaded");
        var compressedGuids = validGuids.map(x => Guid.fromFullToCompressed(x));
        var selectionType = "set";
        for (var model of models) {
            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(model.id, compressedGuids);
            runtimeIds = runtimeIds.filter(x => x != undefined);
            if (runtimeIds == undefined || runtimeIds.length == 0)
                continue;
            var selector = { modelObjectIds: [{ modelId: model.id, objectRuntimeIds: runtimeIds }] };
            await API.viewer.setSelection(selector, selectionType);
            selectionType = "add";
        }
    }
}

function getOdooSlipUrl(slipId) {
    return `${odooURL}/web#id=${slipId}&action=3552&model=vpb.delivery.slip&view_type=form&cids=1&menu_id=2270`;
}

function checkUsernameAndPassword() {
    var username = odooUsernameTextbox.dxTextBox("instance").option("value");
    var password = odooPasswordTextbox.dxTextBox("instance").option("value");
    if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
        throw new Error("Ongeldig gebruikersnaam of paswoord.");
    }
}

/*selectedObjects = [{
    ModelId: 1234,
    ObjectRuntimeId: 1234,
    ObjectId: 1234,
    Guid: "123",
    OdooTcmId: 0,
    OdooPmmId: 0,
    Rank: 1,
    OdooCode: "V1234.00TEST.0001",
    DateTransported: Date.now(),
    DateErected: false,
    Prefix: "TEST",
    PosNmbr: 1,
    AssemblyName: "TEST1.1",
    OdooSlipId: 1,
    SlipName: "BON1",
},{
    ModelId: 1234,
    ObjectRuntimeId: 1234,
    ObjectId: 1234,
    Guid: "123",
    OdooTcmId: 1,
    OdooPmmId: 1,
    Rank: 1,
    OdooCode: "V1234.00TEST.0002",
    DateTransported: Date.now(),
    DateErected: Date.now(),
    Prefix: "TEST",
    PosNmbr: 2,
    AssemblyName: "TEST2.1",
    OdooSlipId: 2,
    SlipName: "BON2",
},];*/
var dataGridMontage = $("#dataGridmontage").dxDataGrid({
    dataSource: listObjects,
    keyExpr: 'OdooTcmId',
    showBorders: true,
    selection: {
        mode: 'multiple',
    },
    sorting:
    {
        mode: 'none',
    },
    editing: {
        mode: 'row',
        useIcons: true,
    },
    columns: [{
        dataField: 'AssemblyName',
        caption: "Merk",
        sortOrder: 'asc',
        width: 120,
    }, {
        dataField: 'SlipName',
        caption: 'Bon',
        width: 80,
        cellTemplate(container, options) {
            $(`<a href="${getOdooSlipUrl(options.data.OdooSlipId)}" target="_blank" rel="noopener noreferrer">${options.value}</a>`)
                .appendTo(container);
        },
    },
    {
        name: "buttons1",
        type: 'buttons',
        width: 100,
        buttons: [{
            hint: 'Gemonteerd',
            icon: 'check',
            visible(e) {
                return !e.row.data.DateErected;
            },
            onClick(e) {
                e.row.data.DateErected = new Date(datePicker.dxDateBox("instance").option("value"));
                SetErectionDate(e.row.data);
                e.component.refresh();
            },
        }],
    },
    {
        name: "buttons2",
        type: 'buttons',
        width: 100,
        buttons: [{
            hint: 'Undo',
            icon: 'revert',
            visible(e) {
                return e.row.data.DateErected;
            },
            onClick(e) {
                e.row.data.DateErected = false;
                SetErectionDate(e.row.data);
                e.component.refresh();
            },
        }],
    },
    ],
    onCellPrepared: function (e) {
        if (e.rowType === "data" && e.column.dataField === "AssemblyName") {
            e.cellElement.css("background-color", e.data.DateErected ? "purple" : "darkgreen");
        }
    },
});

// https://github.com/jsdbroughton/ifc-guid/blob/master/Guid.js
// IfcGuid
// ----------------------------------------------------------------------------
// This class is a service class providing methods to generation and conversion
// between compressed and uncompressed string representations of GUIDs
// according to the algorithms used by the Industry Foundation Classes (IFC).
// The algorithm is based on an implementation in c as follows: 
// originally proposed by Jim Forester.
// implemented previously by Jeremy Tammik using hex-encoding
// Peter Muigg, June 1998
// Janos Maros, July 2000
//
// Provided "as-is", no warranty, no support is given to the users of this code
// ----------------------------------------------------------------------------
// Jonathon Broughton, September 2017
//
// Edited to fix a problem with leading 0's
var Guid = (function (ns) {

    const base64Chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '_', '$'];

    const toUInt32 = (bytes, index) =>
        (parseInt(bytes
            .slice(index, index + 4)
            .reduce((str, v) => str + v, ""), 16)) >>> 0;

    const toUInt16 = (bytes, index) =>
        (parseInt(bytes
            .slice(index, index + 2)
            .reduce((str, v) => str + v, ""), 16)) >>> 0;

    const hex = (input) => input.toString(16);

    const pad = (char, input, length, join) => {
        if (Array.isArray(input)) {
            input = input.map((i) => pad(char, i, length));
            return join ? input.join('') : join;
        } else {
            return input.padStart(length, char); //edited
        }
    };

    const cv_to_64 = (number, result, start, len) => {
        let num = number,
            n = len,
            i;

        for (i = 0; i < n; i += 1) {
            result[start + len - i - 1] = base64Chars[parseInt(num % 64, 10)];
            num = num / 64;
        }
        return result;
    };

    const cv_from_64 = (str, start, len) => {
        let i, j, index,
            res = 0;

        for (i = 0; i < len; i += 1) {
            index = -1;
            for (j = 0; j < 64; j += 1) {
                if (base64Chars[j] === str[start + i]) {
                    index = j;
                    break;
                }
            }
            res = res * 64 + (index >>> 0);
        }
        return res;
    };

    ns.fromFullToCompressed = function (guid) {

        const num = [];
        let str = [],
            i,
            n = 2,
            pos = 0;

        const headBytes = ((guid) => {
            const bytes = [];
            guid.split('-').map((number, index) => {
                const bytesInChar = number.match(/.{1,2}/g);
                bytesInChar.map((byte) => bytes.push(byte));
            });
            return bytes;
        })(guid);

        const tailBytes = ((guid) => {
            const bytes = [];
            guid.split('-').map((number, index) => {
                const bytesInChar = number.match(/.{1,2}/g);
                bytesInChar.map((byte) => bytes.push(parseInt(byte, 16)));
            });
            return bytes;
        })(guid);

        num[0] = (toUInt32(headBytes, 0) / 16777216) >>> 0;
        num[1] = (toUInt32(headBytes, 0) % 16777216) >>> 0;
        num[2] = (toUInt16(headBytes, 4) * 256 + toUInt16(headBytes, 6) / 256) >>> 0;
        num[3] = ((toUInt16(headBytes, 6) % 256) * 65536 + tailBytes[8] * 256 + tailBytes[9]) >>> 0;
        num[4] = (tailBytes[10] * 65536 + tailBytes[11] * 256 + tailBytes[12]) >>> 0;
        num[5] = (tailBytes[13] * 65536 + tailBytes[14] * 256 + tailBytes[15]) >>> 0;

        for (i = 0; i < 6; i++) {
            str = cv_to_64(num[i], str, pos, n);
            pos += n;
            n = 4;
        }

        return str.join('');
    };

    ns.fromCompressedToFull = function (compressed) {
        const str = compressed.split(''),
            num = [];
        let n = 2,
            pos = 0,
            i;

        for (i = 0; i < 6; i += 1) {
            num[i] = cv_from_64(str, pos, n);
            pos += n;
            n = 4;
        }

        const a = hex(num[0] * 16777216 + num[1] >>> 0);
        const b = hex((num[2] / 256) >>> 0);
        const c = hex(((num[2] % 256) * 256 + num[3] / 65536) >>> 0);
        const d = [];

        d[0] = hex(((num[3] / 256) % 256) >>> 0);
        d[1] = hex(((num[3]) % 256) >>> 0);
        d[2] = hex((num[4] / 65536) >>> 0);
        d[3] = hex((num[4] / 256) % 256 >>> 0);
        d[4] = hex((num[4]) % 256 >>> 0);
        d[5] = hex((num[5] / 65536) >>> 0);
        d[6] = hex((num[5] / 256) % 256 >>> 0);
        d[7] = hex((num[5]) % 256 >>> 0);

        return [
            pad("0", a.toString(16), 8),
            pad("0", b.toString(16), 4),
            pad("0", c.toString(16), 4),
            pad("0", d.slice(0, 2), 2, true),
            pad("0", d.slice(2), 2, true)
        ]
            .join('-');
    };

    return ns;
}(Guid || {}));