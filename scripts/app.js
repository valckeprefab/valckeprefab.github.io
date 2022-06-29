var API = null;
var odooURL = "https://odoo.valcke-prefab.be";
var odooDatabase = "erp_prd"

window.onload = async function () {
    API = await Workspace.connect(window.parent, (event, data) => {
        console.log("Event: ", event, data);

        var eventName = event.split(".").pop();

        if (eventName === "onSelectionChanged") {
            selectionChanged(data.data);
        }
    });

    fillObjectStatuses();
    setInterval(getRecentOdooData, 5000);
}

const prefixes = [
    'BD',
    'BF',
    'BH',
    'BP',
    'BS',
    'BV',
    'DEURKADER',
    'DG',
    'DORPEL',
    'DORPELBA',
    'FCITERNE',
    'FLIFT',
    'FM',
    'FPP',
    'FPV',
    'FSMEER',
    'FZ',
    'GI',
    'GU',
    'Hi',
    'Hm',
    'K',
    'KM',
    'KMZOOL',
    'KOKER',
    'KR',
    'KS',
    'KY',
    'LAADKADE',
    'LC',
    'LU',
    'LV',
    'LY',
    'MP',
    'Pi',
    'PLAAT',
    'Pm',
    'PORTIEK',
    'PP',
    'PS',
    'PV',
    'SK',
    'SL',
    'SPr',
    'SS',
    'TRAP',
    'TRAPBORDES',
    'TREKKER',
    'TRIB',
    'TT',
    'TTT',
    'VENSTERK',
    'VENTILA',
    'W',
    'WANDREGE',
];

const filterTypes = [
    'Prefix',
    'Merk',
    'Manueel gebruikersattribuut',
];

var filterTypeSelectBox = $('#filterTypeSelection').dxSelectBox({
    items: filterTypes,
    onValueChanged: function (e) {
        var prefixSelectDiv = document.getElementById("prefixSelectionGrp");
        var assemblyInputDiv = document.getElementById("assemblyInputGrp");
        var manualInputDiv = document.getElementById("manualInputGrp");

        prefixSelectDiv.style.display = "none";
        assemblyInputDiv.style.display = "none";
        manualInputDiv.style.display = "none";

        var selectedItem = e.component.option("selectedItem");
        if (selectedItem === "Prefix") {
            prefixSelectDiv.style.display = "block";
        }
        else if (selectedItem === "Merk") {
            assemblyInputDiv.style.display = "block";
        }
        else if (selectedItem === "Manueel gebruikersattribuut") {
            manualInputDiv.style.display = "block";
        }
    },
});

var odooUsernameTextbox = $('#placeholderOdooUsername').dxTextBox({
    placeholder: 'Vul Odoo gebruikersnaam in, bvb Mattias Hemeryck wordt mhemeryck',
});

var odooPasswordTextbox = $('#placeholderOdooPassword').dxTextBox({
    mode: 'password',
    placeholder: 'Vul Odoo paswoord in',
});

var checkBoxToday = $('#checked').dxCheckBox({
    value: true,
    onValueChanged: function (e) {
        var dateDiv = document.getElementById("dateDiv");
        if (Boolean(e.value)) {
            dateDiv.style.display = "none";
        }
        else {
            dateDiv.style.display = "block";
        }
    },
});

var referenceDatePicker = $('#date').dxDateBox({
    calendarOptions: { firstDayOfWeek: 1 },
    type: 'date',
    label: "dag/maand/jaar",
    displayFormat: 'dd/MM/yyyy',
    value: Date.now(),
});

const StatusModelled = "Modelled";
const StatusExisting = "Existing";
const StatusDrawn = "Drawn";
const StatusOnHold = "OnHold";
const StatusPlanned = "Planned";
const StatusDemoulded = "Demoulded";
const StatusProductionEnded = "ProductionEnded";
const StatusAvailableForTransport = "AvailableForTransport";
const StatusTransported = "Transported";
var ObjectStatuses = [];
function fillObjectStatuses() {
    var modelled = {
        Status: StatusModelled,
        Color: { r: 211, g: 211, b: 211 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(modelled);

    var existing = {
        Status: StatusExisting,
        Color: { r: 80, g: 56, b: 48 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(existing);

    var drawn = {
        Status: StatusDrawn,
        Color: { r: 221, g: 160, b: 221 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(drawn);

    var onHold = {
        Status: StatusOnHold,
        Color: { r: 255, g: 0, b: 0 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(onHold);

    var planned = {
        Status: StatusPlanned,
        Color: { r: 255, g: 140, b: 0 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(planned);

    var demoulded = {
        Status: StatusDemoulded,
        Color: { r: 128, g: 128, b: 0 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(demoulded);

    var prodEnded = {
        Status: StatusProductionEnded,
        Color: { r: 255, g: 255, b: 0 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(prodEnded);

    var availForTransport = {
        Status: StatusAvailableForTransport,
        Color: { r: 0, g: 128, b: 255 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(availForTransport);

    var transported = {
        Status: StatusTransported,
        Color: { r: 34, g: 177, b: 76 },
        Guids: [],
        CompressedIfcGuids: []
    };
    ObjectStatuses.push(transported);
}

function ClearObjectStatusesGuids() {
    for (var os in ObjectStatuses) {
        os.Guids = [];
        os.CompressedIfcGuids = [];
    }
}

function getColorString(color) {
    return "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
}

var lastUpdate = "";
var modelIsColored = false;
async function getRecentOdooData() {
    if (!modelIsColored)
        return;

    //Authenticate with MUK API
    var token = await getToken();

    //var debugInfo = "";
    //Get project name
    var regexProjectName = /^[TV]\d+_\w+/;
    var project = await API.project.getProject();//{ name: "V8597_VDL" };//
    //debugInfo = debugInfo.concat("<br />Project name: " + project.name);
    //$(debug).html(debugInfo);
    if (!regexProjectName.test(project.name))
        return;
    var projectNumber = project.name.split("_")[0];

    //Get project ID
    var id = await GetProjectId(projectNumber);

    if (lastUpdate === "") {
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: '[["project_id.id", "=", "' + id + '"]]',
                order: 'write_date desc',
                limit: 1,
                fields: '["id", "write_date"]'
            },
            success: function (data) {
                lastUpdate = data[0].write_date;
                lastUpdate = addASecond(lastUpdate);
                console.log("Last update: " + lastUpdate);
            }
        });
    }
    else {
        await $.ajax({
            type: "GET",
            url: odooURL + "/api/v1/search_read",
            headers: { "Authorization": "Bearer " + token },
            data: {
                model: "trimble.connect.main",
                domain: '[["project_id.id", "=", "' + id + '"],["write_date",">=","' + lastUpdate + '"]]',
                order: 'write_date desc',
                fields: '["id", "write_date", "name", "date_drawn", "date_fab_planned", "date_fab_dem", "date_fab_end", "date_transported", "state", "mark_available"]',
            },
            success: async function (data) {
                var date = GetStringFromDate(new Date());
                if (data.length > 0) {
                    console.log(date + ": " + data.length + " updated records found.");
                    lastUpdate = data[0].write_date;
                    lastUpdate = addASecond(lastUpdate);

                    var referenceDate = new Date();
                    referenceDate.setHours(23);
                    referenceDate.setMinutes(59);
                    referenceDate.setSeconds(59);
                    for (const record of data) {
                        var status = getStatus(record, referenceDate);
                        var color = getColorByStatus(status);

                        const mobjectsArr = await API.viewer.getObjects({ parameter: { properties: { 'Default.GUID': record.name } } });
                        console.log("mobjectsArr length: " + mobjectsArr.length);

                        for (const mobjects of mobjectsArr) {
                            var modelId = mobjects.modelId;
                            console.log("modelId: " + modelId);
                            var compressedIfcGuids = [];
                            console.log("record.name: " + record.name);
                            var compressedIfcGuid = Guid.fromFullToCompressed(record.name);
                            console.log("compressedIfcGuid: " + compressedIfcGuid);
                            compressedIfcGuids.push(compressedIfcGuid);
                            var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, compressedIfcGuids);
                            await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: color });
                        }
                    }
                }
                else {
                    console.log(date + ": no updated records found.");
                }
            }
        });
    }
}

function addASecond(s) {
    var dateS = GetDateAndTimeFromString(s);
    dateS = new Date(dateS.setSeconds(dateS.getSeconds() + 1));
    return GetStringFromDate(dateS);
}

var token = "";
var refresh_token = "";
var tokenExpiretime;
var client_id = "3oVDFZt2EVPhAOfQRgsRDYI9pIcdcdTGYR7rUSST";
var client_secret = "PXthv4zShfW5NORk4bKFgr6O1dlYTxqD8KwFlx1S";
async function getToken() {
    if (token !== "" && refresh_token !== "" && tokenExpiretime.getTime() > Date.now() - 60000) {
        console.log("Refreshing token");
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
            success: function () {
                refreshSuccesful = true;
            },
        });
        if (!refreshSuccesful) {
            token = "";
        }
        console.log("End refresh token");
    }
    if (token === "") {
        console.log("Fetching token");
        var username = odooUsernameTextbox.dxTextBox("instance").option("value");
        var password = odooPasswordTextbox.dxTextBox("instance").option("value");
        if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
            console.log("no username and/or password found");
            throw "Gelieve gebruikersnaam en/of paswoord in te vullen.";
        }
        //console.log("Start db name fetch1");
        //await $.ajax({
        //    type: "GET",
        //    url: odooURL + "/api/v1/database",
        //    data: {
        //        db: odooDatabase
        //    },
        //    success: function (data) {
        //        console.log(data); 
        //    },
        //});
        //console.log("Einde db name fetch");
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
                token = data.access_token;
                refresh_token = data.refresh_token;
                console.log(data);
                tokenExpiretime = new Date(Date.now() + data.expires_in * 1000);
                console.log(tokenExpiretime);
            }
        });
        console.log("Token received");
    }
    return token;
}

function getStatus(record, referenceDate) {
    if (typeof record.state === 'string' && record.state === 'onhold') {
        return StatusOnHold;
    }
    else if (typeof record.date_transported === 'string' && GetDateFromString(record.date_fab_dem) <= referenceDate) {
        return StatusTransported;
    }
    else if (typeof record.date_fab_end === 'string' && GetDateFromString(record.date_fab_end) <= referenceDate) {
        if (record.mark_available) {
            return StatusAvailableForTransport;
        }
        else {
            return StatusProductionEnded;
        }
    }
    else if (typeof record.date_fab_dem === 'string' && GetDateFromString(record.date_fab_dem) <= referenceDate) {
        return StatusDemoulded;
    }
    else if (typeof record.date_fab_planned === 'string' && GetDateFromString(record.date_fab_planned) <= referenceDate) {
        return StatusPlanned;
    }
    else if (typeof record.date_drawn === 'string' && GetDateFromString(record.date_drawn) <= referenceDate) {
        return StatusDrawn;
    }
    else {
        return StatusModelled;
    }
}

function getColorByStatus(status) {
    var color = { r: 211, g: 211, b: 211 };
    var ostat = ObjectStatuses.find(o => o.Status === status);
    if (ostat !== undefined)
        color = ostat.Color;
    return color;
}

async function GetProjectId(projectNumber) {
    var id = -1;
    //console.log("Start get project Id");
    //console.log("Odoo URL: " + odooURL + "/api/v1/search_read");
    //console.log("using token: " + token);
    await $.ajax({
        type: "GET",
        url: odooURL + "/api/v1/search_read",
        headers: { "Authorization": "Bearer " + token },
        data: {
            model: "project.project",
            domain: '[["project_identifier", "=", "' + projectNumber + '"]]',
            fields: '["id", "project_identifier"]',
        },
        success: function (data) {
            //console.log(data);
            id = data[0].id;
        }
    });
    //console.log("End get project Id");
    return id;
}

$(function () {
    $("#setColorFromStatus").dxButton({
        stylingMode: "outlined",
        text: "Kleur elementen volgens planningsstatus",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: async function (data) {
            data.component.option('text', 'Bezig met inkleuren volgens status');
            buttonIndicator.option('visible', true);
            document.getElementById("legend").style.display = 'block';
            document.getElementById("legendExisting").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusExisting).Color);
            document.getElementById("legendModelled").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusModelled).Color);
            document.getElementById("legendOnHold").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusOnHold).Color);
            document.getElementById("legendDrawn").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusDrawn).Color);
            document.getElementById("legendPlanned").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusPlanned).Color);
            document.getElementById("legendDemoulded").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusDemoulded).Color);
            document.getElementById("legendProductionEnded").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusProductionEnded).Color);
            document.getElementById("legendAvailableForTransport").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusAvailableForTransport).Color);
            document.getElementById("legendTransported").style.backgroundColor = getColorString(ObjectStatuses.find(o => o.Status === StatusTransported).Color);
            try {

                //var debugInfo = "";
                //Get project name
                var regexProjectName = /^[TV]\d+_\w+/;
                var project = await API.project.getProject(); //{ name: "V8597_VDL" };  
                //debugInfo = debugInfo.concat("<br />Project name: " + project.name);
                //$(debug).html(debugInfo);
                if (!regexProjectName.test(project.name))
                    return;
                var projectNumber = project.name.split("_")[0];

                //debugInfo = debugInfo.concat("<br />Project number: " + projectNumber);
                //console.log(debugInfo);

                //Authenticate with MUK API
                var token = await getToken();

                //Get project ID
                var id = await GetProjectId(projectNumber);

                ClearObjectStatusesGuids();
                var referenceDate = new Date();
                referenceDate.setHours(23);
                referenceDate.setMinutes(59);
                referenceDate.setSeconds(59);
                var referenceToday = checkBoxToday.dxCheckBox("instance").option("value");
                console.log("referenceToday: " + referenceToday);
                if (!Boolean(referenceToday)) {
                    referenceDate = new Date(referenceDatePicker.dxDateBox("instance").option("value"));
                    console.log("referenceDate: " + referenceDate);
                }
                var ended = 0;
                var lastId = -1;
                while (ended != 1) { //loop cuz only 80 records get fetched at a time
                    await $.ajax({
                        type: "GET",
                        url: odooURL + "/api/v1/search_read",
                        headers: { "Authorization": "Bearer " + token },
                        data: {
                            model: "trimble.connect.main",
                            domain: '[["project_id.id", "=", "' + id + '"],["id", ">", "' + lastId + '"]]',
                            fields: '["id", "name", "date_drawn", "date_fab_planned", "date_fab_dem", "date_fab_end", "date_transported", "state", "mark_available"]',
                        },
                        success: function (data) {
                            if (data.length == 0) { //no more records
                                ended = 1;
                                return;
                            }
                            for (const record of data) {
                                lastId = record.id;
                                var status = getStatus(record, referenceDate);
                                var guidArr = ObjectStatuses.find(o => o.Status === status);
                                guidArr.Guids.push(record.name);
                                guidArr.CompressedIfcGuids.push(Guid.fromFullToCompressed(record.name));
                            }
                            console.log("records fetched");
                        }
                    });
                }

                const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });

                for (const mobjects of mobjectsArr) {
                    var modelId = mobjects.modelId;
                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                    const objectsIfcIds = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds);

                    var compressedIfcGuidsWithKnownStatus = [];
                    for (const objStatus of ObjectStatuses) {
                        compressedIfcGuidsWithKnownStatus = compressedIfcGuidsWithKnownStatus.concat(objStatus.CompressedIfcGuids);
                    }
                    var compressedIfcGuidsWithKnownStatusSet = new Set(compressedIfcGuidsWithKnownStatus);

                    const unplannedIfcIds = objectsIfcIds.filter(x => !compressedIfcGuidsWithKnownStatusSet.has(x));

                    var objectStatusModelled = ObjectStatuses.find(o => o.Status === StatusModelled);
                    objectStatusModelled.CompressedIfcGuids = Array.from(unplannedIfcIds);
                    objectStatusModelled.Guids = objectStatusModelled.CompressedIfcGuids.map(c => Guid.fromCompressedToFull(c));

                    for (const objStatus of ObjectStatuses) {
                        var runtimeIds = await API.viewer.convertToObjectRuntimeIds(modelId, objStatus.CompressedIfcGuids);
                        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIds }] }, { color: objStatus.Color });
                    }
                }

                const mobjectsExisting = await API.viewer.getObjects({ parameter: { properties: { 'Default.MERKPREFIX': 'BESTAAND' } } });
                for (const mobjects of mobjectsExisting) {
                    var modelId = mobjects.modelId;
                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                    var objectStatusExisting = ObjectStatuses.find(o => o.Status === StatusExisting);
                    objectStatusExisting.CompressedIfcGuids = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds);
                    objectStatusExisting.Guids = objectStatusExisting.CompressedIfcGuids.map(i => Guid.fromCompressedToFull(i));
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { color: objectStatusExisting.Color });
                }

                modelIsColored = true;
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', 'Kleur elementen volgens planningsstatus');
        },
    });
});

function selectionChanged(data) {

}

$(function () {
    $("#setOdooLabels").dxButton({
        stylingMode: "outlined",
        text: "Plaats labels 'Merk.Serienummer' van geselecteerde",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: async function (data) {
            data.component.option('text', 'Bezig met Odoogegevens ophalen');
            buttonIndicator.option('visible', true);
            try {
                var username = odooUsernameTextbox.dxTextBox("instance").option("value");
                var password = odooPasswordTextbox.dxTextBox("instance").option("value");
                if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
                    console.log("no username and/or password found");
                    throw "Gelieve gebruikersnaam en/of paswoord in te vullen.";
                }

                //Authenticate with MUK API
                var token = await getToken();

                let jsonArray = "[";
                const selection = await API.viewer.getSelection();
                const selector = {
                    modelObjectIds: selection
                };
                const mobjectsArr = await API.viewer.getObjects(selector);
                for (const mobjects of mobjectsArr) {
                    const objectsIds = mobjects.objects.map(o => o.id);
                    const objPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectsIds);
                    for (const objproperties of objPropertiesArr) {
                        let cogX = 0.0;
                        let cogY = 0.0;
                        let cogZ = 0.0;
                        let guid = "";
                        let propertiesFound = 0;
                        for (const propertyset of objproperties.properties) {
                            for (const property of propertyset.properties) {
                                const propertyName = property.name;
                                const propertyValue = property.value;
                                if (typeof propertyName !== "undefined" && typeof propertyValue !== "undefined") {
                                    if (propertyName === "COG_X") {
                                        cogX = propertyValue;
                                        propertiesFound++;
                                    }
                                    else if (propertyName === "COG_Y") {
                                        cogY = propertyValue;
                                        propertiesFound++;
                                    }
                                    else if (propertyName === "COG_Z") {
                                        cogZ = propertyValue;
                                        propertiesFound++;
                                    }
                                    else if (propertyName === "GUID") {
                                        guid = propertyValue;
                                        propertiesFound++;
                                    }
                                }
                            }
                        }
                        if (propertiesFound != 4) {
                            continue;
                        }

                        var markId = "";
                        var rank;
                        var assemblyPos = "";
                        await $.ajax({
                            type: "GET",
                            url: odooURL + "/api/v1/search_read",
                            headers: { "Authorization": "Bearer " + token },
                            data: {
                                model: "trimble.connect.main",
                                domain: '[["name", "=", "' + guid + '"]]',
                                fields: '["id", "mark_id", "rank"]',
                            },
                            success: function (data) {
                                if (typeof data[0] !== 'undefined') {
                                    markId = data[0].mark_id[0];
                                    rank = data[0].rank;
                                }
                            }
                        });

                        if (markId === "") {
                            continue;
                        }

                        await $.ajax({
                            type: "GET",
                            url: odooURL + "/api/v1/read",
                            headers: { "Authorization": "Bearer " + token },
                            data: {
                                model: "project.master_marks",
                                domain: '[["id", "=", "' + markId + '"]]',
                                fields: '["id", "mark_ref"]',
                            },
                            success: function (data) {
                                assemblyPos = data[0].mark_ref;
                            }
                        });

                        if (assemblyPos === "") {
                            continue;
                        }

                        jsonArray = jsonArray.concat("{");
                        jsonArray = jsonArray.concat("\"color\": {\"r\": 60,\"g\": 203,\"b\": 62,\"a\": 255}, ");
                        jsonArray = jsonArray.concat("\"start\": ");
                        jsonArray = jsonArray.concat("{");
                        jsonArray = jsonArray.concat("\"positionX\": ");
                        jsonArray = jsonArray.concat(cogX);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"positionY\": ");
                        jsonArray = jsonArray.concat(cogY);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"positionZ\": ");
                        jsonArray = jsonArray.concat(cogZ);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"modelId\": ");
                        jsonArray = jsonArray.concat("\"");
                        jsonArray = jsonArray.concat(mobjects.modelId);
                        jsonArray = jsonArray.concat("\"");
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"objectId\": ");
                        jsonArray = jsonArray.concat(objproperties.id);
                        jsonArray = jsonArray.concat("}");
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"end\": ");
                        jsonArray = jsonArray.concat("{");
                        jsonArray = jsonArray.concat("\"positionX\": ");
                        jsonArray = jsonArray.concat(cogX);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"positionY\": ");
                        jsonArray = jsonArray.concat(cogY);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"positionZ\": ");
                        jsonArray = jsonArray.concat(cogZ);
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"objectId\": null");
                        jsonArray = jsonArray.concat("}");
                        jsonArray = jsonArray.concat(",");
                        jsonArray = jsonArray.concat("\"text\": ");
                        jsonArray = jsonArray.concat("\"");
                        jsonArray = jsonArray.concat(assemblyPos + "." + rank);
                        jsonArray = jsonArray.concat("\"");
                        jsonArray = jsonArray.concat("}");
                        jsonArray = jsonArray.concat(",");
                    }
                }

                jsonArray = jsonArray = jsonArray.slice(0, -1);
                jsonArray = jsonArray.concat("]");
                API.markup.removeMarkups();
                API.markup.addTextMarkup(JSON.parse(jsonArray));
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', "Plaats labels 'Merk.Serienummer' van geselecteerde");
        },
    });
});

var regexDate = /[0-9]{4}-[0-9]{2}-[0-9]{2}/;
function GetDateFromString(s) {
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

var regexDateAndTime = /[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}/;
function GetDateAndTimeFromString(s) {
    var date = null;
    var resultDate = s.match(regexDateAndTime);
    if (resultDate != null) {
        var splitDateTime = resultDate[0].split(" ");
        var splitDate = splitDateTime[0].split("-");
        var splitTime = splitDateTime[1].split(":");
        var year = splitDate[0];
        var month = splitDate[1];
        var day = splitDate[2];
        var hours = splitTime[0];
        var minutes = splitTime[1];
        var seconds = splitTime[2];
        date = new Date(year, month - 1, day, hours, minutes, seconds);
    }
    return date;
}

function GetStringFromDate(d) {
    var year = d.getFullYear();
    var month = pad("00", d.getMonth() + 1);
    var day = pad("00", d.getDate());
    var hours = pad("00", d.getHours());
    var minutes = pad("00", d.getMinutes());
    var seconds = pad("00", d.getSeconds());
    var returnstr = year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
    return returnstr;
}

function pad(pad, str) {
    if (typeof str === 'undefined')
        return pad;
    return (pad + str).slice(-pad.length);
}

const assemblyTextBox = $('#placeholder').dxTextBox({
    placeholder: 'Geef een merk op, bvb K10 ...',
});

const propertyNameTextBox = $('#placeholderPropertyName').dxTextBox({
    placeholder: 'Geef een property name op, bvb. Default.MERKENPREFIX',
});

const propertyValueTextBox = $('#placeholderPropertyValue').dxTextBox({
    placeholder: 'Geef een property value op, bvb PS',
});

const prefixSelectionTagBox = $('#prefixSelection').dxTagBox({
    items: prefixes,
    showSelectionControls: true,
    applyValueMode: 'useButtons',
    //onValueChanged: function () {
    //    DevExpress.ui.notify("The button was clicked");
    //},
});

var idsPerPrefixPerModelId = [];
$(function () {
    $("#btnShowKnownPrefixes").dxButton({
        stylingMode: "outlined",
        text: "Toon enkel gekende prefixen",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: async function (data) {
            data.component.option('text', 'Bezig met elementen te filteren');
            buttonIndicator.option('visible', true);
            try {
                const mobjectsArr = await API.viewer.getObjects({ parameter: { class: "IFCELEMENTASSEMBLY" } });
                var spliceLength = 5000;
                for (const mobjects of mobjectsArr) {
                    var modelId = mobjects.modelId;
                    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: false });
                    if (idsPerPrefixPerModelId.find(o => o.ModelId === modelId) !== undefined) {
                        continue;
                    }
                    var idsPerPrefix = [];
                    for (var i = 0; i < objectsRuntimeIds.length; i += spliceLength) {
                        //var cntr = 0;
                        var objectsRuntimeIdsSpliced = objectsRuntimeIds.slice(i, i + spliceLength);
                        const objectPropertiesArr = await API.viewer.getObjectProperties(modelId, objectsRuntimeIdsSpliced);
                        //console.log("objectPropertiesArr: " + objectPropertiesArr);
                        //console.log("objectPropertiesArr.length: " + objectPropertiesArr.length);
                        for (const objproperties of objectPropertiesArr) {
                            //objproperties type: ObjectProperties, heeft id van object en array met propertysets
                            //objproperties.properties : PropertySet[]
                            //PropertySet.set is not included in the query
                            //console.log("objproperties.properties.length: " + objproperties.properties.length);
                            //var psetDefault = objproperties.properties.find(s => s.name === "Default");
                            //if (psetDefault === undefined) continue;
                            //console.log("psetDefault: " + psetDefault.name);
                            //var propPrefix = psetDefault.properties.find(p => p.name === "MERKPREFIX");
                            var propPrefix = objproperties.properties.flatMap(p => p.properties).find(p => p.name === "MERKPREFIX");
                            if (propPrefix === undefined) continue;
                            //console.log("propPrefix: " + propPrefix.name + " " + propPrefix.value);
                            if (!prefixes.includes(propPrefix.value)) continue;
                            var prefixArr = idsPerPrefix.find(p => p.Prefix === propPrefix.value);
                            if (prefixArr !== undefined) {
                                prefixArr.ObjectRuntimeIds.push(objproperties.id);
                                //cntr++;
                            }
                            else {
                                idsPerPrefix.push(
                                    {
                                        Prefix: propPrefix.value,
                                        ObjectRuntimeIds: [objproperties.id]
                                    }
                                );
                                //cntr++;
                            }
                        }
                        //console.log("i: " + i + " - cntr: " + cntr);
                    }
                    //console.log("new ids pushed for model " + modelId + " (#: " + idsPerPrefix.length + " )");
                    idsPerPrefixPerModelId.push({ ModelId: modelId, IdsPerPrefix: idsPerPrefix });
                }

                //set all objects invisible
                //for (const mobjects of mobjectsArr) {
                //    var modelId = mobjects.modelId;
                //    const objectsRuntimeIds = mobjects.objects.map(o => o.id);
                //    await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: objectsRuntimeIds }] }, { visible: false });
                //}

                //show only known prefixes
                for (const modelIdDict of idsPerPrefixPerModelId) {
                    var modelId = modelIdDict.ModelId;
                    //console.log("Showing objects of model " + modelId);
                    var runtimeIdsToShow = [];
                    for (const idsPerPrefix of modelIdDict.IdsPerPrefix) {
                        runtimeIdsToShow = runtimeIdsToShow.concat(idsPerPrefix.ObjectRuntimeIds);
                    }
                    //console.log("runtimeIdsToShow.length " + runtimeIdsToShow.length);
                    if (runtimeIdsToShow.length > 0) {
                        //console.log("change to visible");
                        //console.log("runtimeIdsToShow[0]" + runtimeIdsToShow[0]);
                        await API.viewer.setObjectState({ modelObjectIds: [{ modelId, objectRuntimeIds: runtimeIdsToShow }] }, { visible: true });
                    }
                }
            }
            catch (e) {
                console.log(e);
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', 'Toon enkel gekende prefixen');
        },
    });
});

$(function () {
    $("#button").dxButton({
        stylingMode: "outlined",
        text: "Selecteer o.b.v. gekozen filter",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: function (data) {
            data.component.option('text', 'Bezig met elementen te selecteren');
            buttonIndicator.option('visible', true);
            try {
                SetSelectionByFilter();
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', 'Selecteer o.b.v. gekozen filter');
        },
    });
});

function SetSelectionByFilter()
{
    var selectedItem = filterTypeSelectBox.dxSelectBox("instance").option("selectedItem");
    if (selectedItem === "Prefix") {
        var selected = prefixSelectionTagBox.dxTagBox("instance").option("selectedItems");
        for (let i = 0; i < selected.length; i++) {
            var actionType = i == 0 ? "set" : "add";
            setObjectSelectionByPropnameAndValue("Default.MERKPREFIX", selected[i], actionType);
        }
    }
    else if (selectedItem === "Merk") {
        var text = assemblyTextBox.dxTextBox("instance").option("value");
        setObjectSelectionByPropnameAndValue("Default.MERKNUMMER", text, "set");
    }
    else if (selectedItem === "Manueel gebruikersattribuut") {
        var propertyName = propertyNameTextBox.dxTextBox("instance").option("value");
        var propertyValue = propertyValueTextBox.dxTextBox("instance").option("value");
        setObjectSelectionByPropnameAndValue(propertyName, propertyValue, "set");
    }

    setObjectSelectionByPropnameAndValue("Tekla Common.Finish", "MONTAGE", "add");
}

$(function () {
    $("#showGridAndArrows").dxButton({
        stylingMode: "outlined",
        text: "Toon stramien en montagepijlen",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: async function (data) {
            data.component.option('text', 'Bezig met stramien en montagepijlen te zoeken');
            buttonIndicator.option('visible', true);
            try {
                console.log("start");

                //Show Grids
                const mobjectsArrGrids = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Presentation Layers.Layer", "Grid 0.0"));
                console.log("mobjectsArrGrids.length: " + mobjectsArrGrids.length);
                console.log("mobjectsArrGrids[0].objects.length: " + mobjectsArrGrids[0].objects.length);
                if (mobjectsArrGrids.length > 0) {
                    await API.viewer.setObjectState(mobjectsArrGrids, true);
                }

                //Show Arrows
                const mobjectsArrPijlen = await API.viewer.getObjects(getPropSelectorByPropnameAndValue("Tekla Common.Finish", "MONTAGE"));
                console.log("mobjectsArrPijlen.length: " + mobjectsArrPijlen.length);
                console.log("mobjectsArrPijlen[0].objects.length: " + mobjectsArrPijlen[0].objects.length);
                if (mobjectsArrGrids.length > 0) {
                    await API.viewer.setObjectState(mobjectsArrPijlen, true);
                }

                //await API.viewer.setSelection(mobjectsArrGrids, "add");
                //await API.viewer.setSelection(mobjectsArrPijlen, "add");

                console.log("end");
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', "Toon stramien en montagepijlen");
        },
    });
});

$(function () {
    $("#showLabels").dxButton({
        stylingMode: "outlined",
        text: "Plaats labels 'Merk' van geselecteerde",
        type: "success",
        template(data, container) {
            $(`<div class='button-indicator'></div><span class='dx-button-text'>${data.text}</span>`).appendTo(container);
            buttonIndicator = container.find('.button-indicator').dxLoadIndicator({
                visible: false,
            }).dxLoadIndicator('instance');
        },
        onClick: function (data) {
            data.component.option('text', 'Bezig met labels plaatsen');
            buttonIndicator.option('visible', true);
            try {
                addTextMarkups();
            }
            catch (e) {
                DevExpress.ui.notify(e);
            }
            buttonIndicator.option('visible', false);
            data.component.option('text', "Plaats labels 'Merk' van geselecteerde");
        },
    });
});

async function setObjectsByProp() {
	return doObjectsFilter(async () => API.viewer.setSelection(getPropSelector(), "set"));
}

async function setObjectsByProp2() {
    await API.viewer.setSelection(getPropSelector(), "set");
}

async function setObjectSelectionByPropnameAndValue(propNameFilter, propValueFilter, selectionType) {
    await API.viewer.setSelection(getPropSelectorByPropnameAndValue(propNameFilter, propValueFilter), selectionType);
}

async function doObjectsFilter(action) {
    return doWorkRes("#objectsResult", "#objectsLoading", action);
}

async function doWorkRes(selResult, selLoading, action) {
    return doWorkSafe(() => { //preaction
        $(selResult).html(""); //inhoud van selResult leegmaken
        $(selLoading).show(); //selLoading zichtbaar maken
    }, action, r => { //action , postaction
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
    }
    catch (e) {
        result = err(e);
    }
    postAction(result);
}

async function getObjectsByProp(e) {
    return getObjectsBy(async () => API.viewer.getObjects(getPropSelector()), e);
}

function getPropSelector() {
    return {
        parameter: {
            properties: {
                [$("#propNameFilter").val()]: $("#propValueFilter").val()
            }
        }
    };
}

function getPropSelectorByPropnameAndValue(propNameFilter, propValueFilter) {
    return {
        parameter: {
            properties: {
                [propNameFilter]: propValueFilter
            }
        }
    };
}

async function addTextMarkups() {
    try {
        //SetText2("Start adding markups");
        let jsonArray = "[";
        //SetText2(jsonArray);
        //const propSelector = getPropSelector();
        //await API.viewer.setSelection(propSelector, "set");
        //const mobjectsArr = await API.viewer.getObjects(propSelector);
        //const mobjectsArr = await API.viewer.getSelection();
        const selection = await API.viewer.getSelection();
        const selector = {
            modelObjectIds: selection
        };
        const mobjectsArr = await API.viewer.getObjects(selector);
        //SetText(mobjectsArr.length);
        //mobjectsArr type: ModelObjects[]
        //haalt enkel gemeenschappelijk hebben property sets op
        for (const mobjects of mobjectsArr) {
            //mobjects type: ModelObjects met mobjects.objects type: ObjectProperties[]
            const objectsIds = mobjects.objects.map(o => o.id);
            //const objectsRuntimeIds = await API.viewer.convertToObjectRuntimeIds(mobjects.modelId, objectsIds);
            const objPropertiesArr = await API.viewer.getObjectProperties(mobjects.modelId, objectsIds);
            for (const objproperties of objPropertiesArr) {
                //objproperties type: ObjectProperties
                let cogX = 0.0;
                let cogY = 0.0;
                let cogZ = 0.0;
                let assemblyPos = "";
                let propertiesFound = 0;
                for (const propertyset of objproperties.properties) {
                    for (const property of propertyset.properties) {
                        const propertyName = property.name;
                        const propertyValue = property.value;
                        if (typeof propertyName !== "undefined" && typeof propertyValue !== "undefined") {
                            if (propertyName === "COG_X") {
                                cogX = propertyValue;
                                propertiesFound++;
                            }
                            else if (propertyName === "COG_Y") {
                                cogY = propertyValue;
                                propertiesFound++;
                            }
                            else if (propertyName === "COG_Z") {
                                cogZ = propertyValue;
                                propertiesFound++;
                            }
                            else if (propertyName === "MERKNUMMER") {
                                assemblyPos = propertyValue;
                                propertiesFound++;
                            }
                        }
                    }
                }
                if (propertiesFound != 4) {
                    continue;
                }
                jsonArray = jsonArray.concat("{");
                //jsonArray = jsonArray.concat("\"id\": ");
                //jsonArray = jsonArray.concat(objproperties.id);
                //jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"color\": {\"r\": 60,\"g\": 203,\"b\": 62,\"a\": 255}, ");
                jsonArray = jsonArray.concat("\"start\": ");
                jsonArray = jsonArray.concat("{");
                jsonArray = jsonArray.concat("\"positionX\": ");
                jsonArray = jsonArray.concat(cogX);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"positionY\": ");
                jsonArray = jsonArray.concat(cogY);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"positionZ\": ");
                jsonArray = jsonArray.concat(cogZ);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"modelId\": ");
                jsonArray = jsonArray.concat("\"");
                jsonArray = jsonArray.concat(mobjects.modelId);
                jsonArray = jsonArray.concat("\"");
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"objectId\": ");
                jsonArray = jsonArray.concat(objproperties.id);
                jsonArray = jsonArray.concat("}");
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"end\": ");
                jsonArray = jsonArray.concat("{");
                jsonArray = jsonArray.concat("\"positionX\": ");
                jsonArray = jsonArray.concat(cogX);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"positionY\": ");
                jsonArray = jsonArray.concat(cogY);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"positionZ\": ");
                jsonArray = jsonArray.concat(cogZ);
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"objectId\": null");
                jsonArray = jsonArray.concat("}");
                jsonArray = jsonArray.concat(",");
                jsonArray = jsonArray.concat("\"text\": ");
                jsonArray = jsonArray.concat("\"");
                jsonArray = jsonArray.concat(assemblyPos);
                jsonArray = jsonArray.concat("\"");
                jsonArray = jsonArray.concat("}");
                jsonArray = jsonArray.concat(",");
            }
        }
        //SetText2("Finished going through array");
        jsonArray = jsonArray = jsonArray.slice(0, -1);
        jsonArray = jsonArray.concat("]");
        API.markup.removeMarkups();
        //SetText2(jsonArray);
        API.markup.addTextMarkup(JSON.parse(jsonArray));
    }
    catch (e) {
        //SetErrorText("Error");
        //SetErrorText(e.message);
        //SetText2(jsonArray);
    }
}

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
            return (char * length + input).slice(-length);
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