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

async function getProjectNumber() {
    //Get project name
    var regexProjectName = /^[TV]\d+_\w+/;
    var project = await API.project.getProject();
    if (!regexProjectName.test(project.name))
        return undefined;
    else
        return project.name.split("_")[0];
}

var hasAccesToTransport = false;
var hasAccesToFreights = false;
var selectionChangedIds = [];
var selectedObjects = [];
async function selectionChanged(data) {
    odooAssemblyData = undefined;
    popup.hide();

    if (!hasAccesToTransport && !hasAccesToFreights)
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

    if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
    var tempSelectedObjects = [];
    try {
        for (const mobjects of data) {
            var modelId = mobjects.modelId;
            const objectsRuntimeIds = mobjects.objectRuntimeIds;
            if (objectsRuntimeIds.length == 0)
                continue;
            const objectIds = await API.viewer.convertToObjectIds(modelId, objectsRuntimeIds);
            for (var i = 0; i < objectsRuntimeIds.length; i++) {
                tempSelectedObjects.push({
                    ModelId: modelId,
                    ObjectRuntimeId: objectsRuntimeIds[i],
                    ObjectId: objectIds[i],
                    Guid: Guid.fromCompressedToFull(objectIds[i]),
                    OdooTcmId: -1,
                    OdooPmmId: -1,
                    Prefix: "",
                    PosNmbr: 0,
                    Rank: 0,
                    AssemblyName: "",
                    AvailableForTransport: false,
                    DateTransported: "",
                    SlipName: "",
                    OdooSlipId: -1,
                    Freight: -1,
                    PosInFreight: -1,
                });
            }
        }

        if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
        //Get project name
        var projectNumber = await getProjectNumber();
        if (projectNumber == undefined)
            return;

        //Authenticate with MUK API
        var token = await getToken();

        //Get project ID
        var projectId = await GetProjectId(projectNumber);

        var referenceDate = new Date();
        referenceDate.setHours(23);
        referenceDate.setMinutes(59);
        referenceDate.setSeconds(59);

        for (var i = 0; i < tempSelectedObjects.length; i += fetchLimit) { //loop cuz only fetchLimit records get fetched at a time
            if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
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
                    fields: '["id", "mark_id", "name", "rank", "mark_available", "date_transported", "freight", "pos_in_freight_number"]',
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
                            selectedObject.DateTransported = record.date_transported ? getDateFromString(record.date_transported) : "";
                            selectedObject.AvailableForTransport = record.mark_available;
                            selectedObject.Freight = record.freight;
                            selectedObject.PosInFreight = record.pos_in_freight_number;
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
                        fields: '["id", "mark_mass", "mark_ranking", "mark_prefix", "mark_reinf_type", "mark_profile"]',
                    },
                    success: function (odooData) {
                        for (var record of odooData) {
                            var objects = tempSelectedObjects.filter(x => x.OdooPmmId == record.id);
                            for (var object of objects) {
                                object.Weight = record.mark_mass;
                                object.PosNmbr = record.mark_ranking;
                                object.Prefix = record.mark_prefix;
                                object.AssemblyName = record.mark_prefix + record.mark_ranking + "." + object.Rank;
                                object.ValidForNewSlip = object.AvailableForTransport && object.DateTransported === "";
                                object.Profile = record.mark_profile;
                                object.ReinforcementType = record.mark_reinf_type ? record.mark_reinf_type : "";
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
        if (selectionChangedIds[selectionChangedIds.length - 1] != mySelectionId) return;
        selectedObjects.length = 0;
        selectedObjects.push(...tempSelectedObjects.filter(o => o.OdooTcmId != -1).sort(function (a, b) { return a.PosInFreight - b.PosInFreight; }));
        setPosInFreight();
        clearDataGridProductionSorting();
        dataGridMontage.dxDataGrid("refresh");

        if (resetSlipDropdown) {
            var instanceDropDown = dropDownExistingSlips.dxDropDownBox("instance");
            instanceDropDown.reset();
        }
        resetSlipDropdown = true;
    }
    catch (e) {
        console.log(e);
    }
    performSelectionChanged = true;
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

function getOdooSlipUrl(slipId) {
    return `${odooURL}/web#id=${slipId}&action=3552&model=vpb.delivery.slip&view_type=form&cids=1&menu_id=2270`;
}

var referenceDatePicker = $('#date').dxDateBox({
    calendarOptions: { firstDayOfWeek: 1 },
    type: 'date',
    label: "dag/maand/jaar",
    displayFormat: 'dd/MM/yyyy',
    value: Date.now(),
});

function checkUsernameAndPassword() {
    var username = odooUsernameTextbox.dxTextBox("instance").option("value");
    var password = odooPasswordTextbox.dxTextBox("instance").option("value");
    if (typeof username !== 'string' || typeof password !== 'string' || username === "" || password === "") {
        console.log("no username and/or password found");
        throw getTextById("errorMsgUsernamePassword");
    }
}

var dataGridMontage = $("#dataGridmontage").dxDataGrid({
    dataSource: selectedObjects,
    keyExpr: 'OdooTcmId',
    showBorders: true,
    selection: {
        mode: 'single',
    },
    editing: {
        mode: 'row',
        allowDeleting: true,
        confirmDelete: false,
        useIcons: true,
    },
    columns: [{
        dataField: 'AssemblyName',
        caption: "Merk",
        sortOrder: 'asc',
        width: 120,
        calculateSortValue: function (rowData) {
            return rowData.Prefix.toString().padStart(12, "0") + rowData.PosNmbr.toString().padStart(6, "0") + "." + rowData.Rank.toString().padStart(4, "0");
        },
    }, {
        dataField: 'Weight',
        caption: "Massa [kg]",
        dataType: 'number',
        width: 120,
        format: {
            type: "fixedPoint",
            precision: 0
        },
    }, {
        dataField: 'SlipName',
        caption: 'Bon',
        width: 80,
        cellTemplate(container, options) {
            $(`<a href="${getOdooSlipUrl(options.data.OdooSlipId)}" target="_blank" rel="noopener noreferrer">${options.value}</a>`)
                .appendTo(container);
        },
    },
    ],
    onRowRemoving: async function (e) {
        var instanceDropDown = dropDownExistingSlips.dxDropDownBox("instance");
        instanceDropDown.reset();
        var objectRemoved = selectedObjects.find(x => x.OdooTcmId == e.key);
        if (objectRemoved != undefined) {
            var models = await API.viewer.getModels("loaded");
            for (var model of models) {
                var selector = { modelObjectIds: [{ modelId: model.id, objectRuntimeIds: [objectRemoved.ObjectRuntimeId] }] };
                await API.viewer.setSelection(selector, 'remove');
            }
            e.cancel = true;
        }
    },
    onCellPrepared: function (e) {
        if (e.rowType === "data" /*&& e.column.dataField === "ProductName"*/) {
            e.cellElement.css("color", e.data.ValidForNewSlip ? "white" : "red");
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