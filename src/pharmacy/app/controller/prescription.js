var RaxaEmr_Pharmacy_Controller_Vars = {
    PHARM_PAGES: {
        PRESCRIPTION: {
            value: 0,
            name: "prescription"
        },

        REPORTS: {
            value: 1,
            name: "reports"
        },
        DRUGGROUPS: {
            value: 2,
            name: "drugGroups"
        },
        ALLSTOCK: {
            value: 3,
            name: "allStock"
        },
        DRUGDETAILS: {
            value: 4,
            name: "drugDetails"
        }
    },

    INVENTORY_PAGES : {
        OVERVIEW: {
            value:0, 
            name: "overview"
        },
        REQUISITION: {
            value:1, 
            name: "requisition"
        },
        ISSUE: {
            value:2, 
            name: "goodsIssue"
        },
        RECEIPT: {
            value:3, 
            name: "goodsReceipt"
        }
    },
    
    DOSAGE_FORM_SUFFIX: {
        TABLET: 'tab',
        CAPSULE: 'cap',
        SYRUP: 'syr',
        OINTMENT: 'oint',
        INJECTION: 'inj',
        CREAM: 'cream'
    },
    
    //Here we store all the various strings to keep track of where the inventory is.
    STOCK_STATUS: {
        AVAILABLE: 'available',
        ORDERED: 'ordered',
        SENT: 'sent',
        PRESCRIBED: 'prescribed',
        OUT: 'out',
        EXPIRED: 'expired'
    },
    
    DEFAULT_STOCK_CENTER_LOCATION_TAG: "Default Stock Center",
    DEFAULT_PHARMACY_LOCATION_TAG: "Default Pharmacy",
    DEFAULT_STOCK_LOCATION: "Unknown Location",
    PHARMACY_TAG: "canHaveDrugs",
    
    DRUG_INVENTORY_MODEL:{
        UUID_INDEX: 6,
        BATCH_UUID_INDEX: 12
    },
    
    MONTHS_TO_EXPIRE: 2,
    STOCK_OUT_LIMIT: 80,
    
    TOP_BAR_HEIGHT: 65
};


Ext.define("RaxaEmr.Pharmacy.controller.prescription", {
    extend: 'Ext.app.Controller',
    
    views: ['Viewport', 'prescription', 'pharmacyTopbar', 'addFacility', 'goodsReceiptText', 'listOfDrugs', 'pharmacyDetails',
    'reports', 'stockIssue', 'stockIssueGrid', 'goodsReceiptGrid', 'goodsReceipt', 'goodsIssueText', 'goodsIssueGrid', 'goodsIssue',
    'allStockPanel', 'allStockGrid', 'allStock', 'addDrug', 'allStock', 'prescribedDrugs', 'patientsGridPanel', 'requisition',
    'requisitionText', 'requisitionGrid', 'DrugDetails', 'DrugDetailsText', 'DrugDetailsGrid', 'alertGrid', 'InventoryEditor', 'drugComboBox' , 'patientAssignedDrugs'],
    
    stores: ['orderStore', 'Doctors', 'Identifiers', 'Locations', 'Patients', 'Persons', 'drugOrderPatient', 'drugOrderSearch', 'drugConcept', 'drugEncounter', 'allDrugs', 'Alerts', 'DrugInfos'],
    models: ['Address', 'Doctor', 'Identifier', 'Name', 'Patient', 'Person', 'drugOrderPatient', 'drugOrderSearch', 'drugOrder', 'drugEncounter', 'LocationTag', 'Location', 'PurchaseOrder', 'Alert', 'Provider', 'DrugInfo'],
    
    init: function () {
        // Gets or sets Provider Uuid (beware side-effects)
        Util.getLoggedInProviderUuid();
        
        // Setup event handlers
        this.control({
            ////////////////////////////
            // Prescription
            ////////////////////////////
            
            'prescription [action=addPatient]': {
                click: this.displayForm
            },
            "newPatient button[action=doneWithNewPatientPrescription]": {
                click: function(){
                    this.savePerson();
                }
            },
            'prescription button[action=doneWithQueuedPatientPrescription]': {
                click: this.prescriptionFillPatient
            },
            'prescription button[action=printPrescribedDrugs]': {   //Action of Print button in Search Patient
                click: this.printPrescribedDrugs
            },

            // Prescribed Drugs
            'prescription button[action=addDrugToPrescription]': {
                click: this.addDrug
            },
            'prescribedDrugs': {
                deleteDrug: this.deleteDrug
            },

            'patientsgridpanel': {
                click: function(x) {
                    this.patientSelect(x, "searchGrid");
                }
            },
            'prescription #patientASearchGrid': {
                select: function(grid, record, row) {
                    this.patientSelect(record.data, "searchGrid");
                }
            },
            'prescription #todayPatientGrid': {
                select: function(grid, record, row) {
                    this.patientSelect(record.data, "todayPatientPanel");
                }
            },
            'prescription #sevenDaysPatientGrid': {
                select: function(grid, record, row) {
                    this.patientSelect(record.data, "sevenDaysPatientPanel");
                }
            },
            'prescription #patientNameASearch': {
                specialkey: function(field, e) {
                    if(e.getKey() === KEY.ENTER) {
                        this.searchPatient('patientNameASearch', 'patientASearchGrid');
                    }
                }
            },
            'prescription #todayPatientNameSearch': {
                keyup: function() {
                    this.searchFilteredPatient('todayPatientNameSearch', "todayPatientGrid");
                }
            },
            'prescription #sevenDaysPatientNameSearch': {
                keyup: function() {
                    this.searchFilteredPatient('sevenDaysPatientNameSearch', "sevenDaysPatientGrid");
                }
            },
            "prescription": {
                // as the prescription view activates it attaches listners to the 3 fields and 2
                // girds of advanced search
                activate: function () {
                    this._getStartupUuids();
                    // listner on prescription grid to show drugorder on main grid with more details
                    //                    Ext.getCmp('drugOrderASearchGrid').on('cellClick', function () {
                    //                        this.DrugOrderSelect(Ext.getCmp('drugOrderASearchGrid').getSelectionModel().getSelection()[0]);
                    //                        }, this);
                    //set the proxy for 1 week patient list and make the get call
                    this.getSevenDaysPatients();
                    //set the proxy for todays patient list and make the get call
                    this.getTodayPatients();
                }
            },
            
            "todayPatientGrid": {
                select: this.showQueuedPatient
            },
            
            ////////////////////////////
            // Inventory
            ////////////////////////////

            // Navigation bar
            "inventoryNavBar button[action=navigateInventoryOverview]": {
                click: this.navigateInventoryOverview
            },
            "inventoryNavBar button[action=newRequisition]": {
                click: this.newRequisition
            },
            "inventoryNavBar button[action=newIssue]": {
                click: this.newIssue
            },
            "inventoryNavBar button[action=newReceipt]": {
                click: this.newReceipt
            },
            "inventoryNavBar button[action=newDrug]": {
                click: this.newDrug
            },
            "inventoryNavBar button[action=newDrugGroup]": {
                click: this.newDrugGroup
            },
            'requisitionText #stockLocationPicker':{
                select: this.localStorageStoreLocation
            },
            "allStockPanel button[action=showAvailableStock]": {
                click: this.showAvailableStock
            },
            "allStockPanel button[action=showExpiringStock]": {
                click: this.showExpiringStock
            },
            "allStockPanel button[action=showStockOut]": {
                click: this.showStockOut
            },
            "allStockPanel button[action=showAllOrders]": {
                click: this.showAllOrders
            },

            // Edit Inventory item
            "inventoryEditor button[action=cancelEditInventory]": {
                click: this.cancelEditInventory
            },
            "inventoryEditor button[action=updateInventory]": {
                click: this.updateInventory
            },
            
            //New Patient
            "newPatient button[action=cancelNewPatient]": {
                click: this.cancelNewPatient
            },
            
            // Request Drugs
            'requisition button[action=submitRequisition]': {
                click: this.submitRequisition
            },

            // Drug Details
            'drugDetails button[action=backFromDrugDetails]': {
                click: function(){
                    Ext.getCmp('mainarea').getLayout().setActiveItem(RaxaEmr_Pharmacy_Controller_Vars.PHARM_PAGES.ALLSTOCK.value);
                    Ext.getCmp('allStockGrid').getView().refresh();
                    Ext.getStore('StockList').clearFilter();
                }
            },

            // Send Drugs
            'goodsIssueText button[action=cancelIssuePurchaseOrder]':{
                click: this.cancelIssuePurchaseOrder
            },
            'goodsIssueText #issuePurchaseOrderPicker':{
                select: this.populateIssueFromPurchaseOrder
            },
            'goodsIssue button[action=submitIssue]': {
                click: this.submitIssue
            },
            
            'prescription #currentButton':{
                click: this.currentDatePrescription  
            },
            
            'prescription #historyButton':{
                click: this.historyPatientPrescription  
            },

            // Receive Drugs (Update Stock)
            'goodsReceipt button[action=submitReceipt]': {
                click: this.submitReceipt
            },
            'goodsReceiptText #receiptPurchaseOrderPicker':{
                select: this.populateReceiptFromPurchaseOrder
            },
            'goodsReceiptGrid #addNewDrug':{
                click: this.newDrug
            },
            
            "addDrug button[action=submitNewDrug]": {
                click: this.submitNewDrug
            },
            "addDrug button[action=cancelNewDrug]": {
                click: this.cancelNewDrug
            },

            ////////////////////////////
            // Top Bar (shared)
            ////////////////////////////

            'alertGrid': {
                deleteAlert: this.deleteAlert
            }

        // Other topbar events are handled in the View. They should be moved here.
        });
    },

    ////////////////////////////
    // Prescription
    ////////////////////////////

    // function updates the todays patient grid
    getTodayPatients: function () {
        var enddate = new Date();
        this.getPatientList(enddate, 12, -12, 'todayPatientGrid');
    },

    // function updates the 1 week patient grid
    getSevenDaysPatients: function () {
        var enddate = new Date();
        this.getPatientList(enddate, 24*7 , -12, 'sevenDaysPatientGrid');
    },

    // Gets the list of patients who are waiting for a prescription to be filled
    // (The patients have a prescription encounter but do not have a prescriptionFill encounter)
    // TODO: Until OPD and other areas can create prescriptions, this has been modified so that
    //      any patient who has been **registered** shows up in the pharmacy queue
    getPatientList: function (enddate, backwardtime, forwardtime, patientGridId) {


        Ext.getCmp(patientGridId).getStore().setProxy({
            type: 'rest',
            //getting all patients who have prescriptions that have not been filled
            url: HOST + "/ws/rest/v1/raxacore/patientlist/optimized" + "?encounterType=" + localStorage.outUuidencountertype + "&startDate=" + Util.Datetime(enddate, backwardtime) + "&endDate=" + Util.Datetime(enddate,forwardtime) + "&containsOrderType=orderType" + "&excludeEncounterType=" + localStorage.prescriptionfillUuidencountertype,
            headers: Util.getBasicAuthHeaders(),
            reader: {
                type: 'json',
                root: 'patients'
            }
        });
        // makes the GET call to get the list with patients with prescription encounter and not prescription fill
        Ext.getCmp(patientGridId).getStore().load();

    },

    // Removes drug from OrderStore
    deleteDrug: function (evtData) {
        var store = this.getStore('orderStore');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            store.remove(record);
        }
    },

    // Opens new window, copy-ing
    printPrescribedDrugs: function() {
        var Grid=this.readGrid();
        var selectedPatient = {};
        if(Ext.getCmp('familyName').getValue()!=="") {
            selectedPatient = {
                Name: Ext.getCmp('givenName').getValue()+Ext.getCmp('familyName').getValue(),
                Doctor: Ext.getCmp('doctor').getValue(),
                Age: Ext.getCmp('age').getValue(),
                Gender:Ext.getCmp('sexRadioGroup').getChecked()[0].boxLabel.charAt(0),
                Length : Grid.length,
                DrugGrid:Grid                    
            };
        }
        else {
            selectedPatient = {
                Name: Ext.getCmp('prescriptionPatientName').getValue(),
                Doctor: Ext.getCmp('doctor').getValue(),
                Age: Ext.getCmp('prescriptionPatientAge').getValue(),
                Gender:Ext.getCmp('prescriptionPatientGender').getValue(),
                Length : Grid.length,
                DrugGrid:Grid,
                PatientId : Ext.getCmp('prescriptionPatientId').getValue(),
                PrescriptionDate : Ext.getCmp('prescriptionDate').getValue()
            };
        }
     
        localStorage.setItem('selectedPatient', JSON.stringify(selectedPatient));
        var printWindow = window.open('app/print.html', 'Fill Prescription', 'height=500,width=700,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no,status=yes');
    },
    readGrid: function() {
        var drugs = Ext.getStore('orderStore').data;
        var noofdrugs=0;
        if(drugs.items)
        {
            noofdrugs = drugs.items.length;
        }
        var drugGrid=new Array(noofdrugs);
        for (var i1 = 0; i1 < noofdrugs; i1++) {
            drugGrid[i1]={};
            drugGrid[i1].drugName=drugs.items[i1].data.drugName ;
            drugGrid[i1].dosage=drugs.items[i1].data.dosage ;
            drugGrid[i1].duration=drugs.items[i1].data.duration ;
            drugGrid[i1].qty=drugs.items[i1].data.qty ;
            drugGrid[i1].unitprice=drugs.items[i1].data.unitprice ;
            drugGrid[i1].itemprice=drugs.items[i1].data.itemprice ;
            drugGrid[i1].instructions = drugs.items[i1].data.instructions;
            drugGrid[i1].frequency = drugs.items[i1].data.frequency;
            if(drugs.items[i1].data.takeInMorning) {
                drugGrid[i1].taken = "Morning" 
            }
            if(drugs.items[i1].data.takeInDay) {
                if(drugGrid[i1].taken !== '' && drugGrid[i1].taken !== undefined) {
                    drugGrid[i1].taken = drugGrid[i1].taken + " / Day"
                } else {
                    drugGrid[i1].taken = "Day"
                }
            }
            if(drugs.items[i1].data.takeInEvening) {
                if(drugGrid[i1].taken !== '' && drugGrid[i1].taken !== undefined ) {
                    drugGrid[i1].taken = drugGrid[i1].taken + " / Evening"
                } else {
                    drugGrid[i1].taken =  "Evening"
                }
            }
            if(drugs.items[i1].data.takeInNight) {
                if( drugGrid[i1].taken !== '' && drugGrid[i1].taken !== undefined) {
                    drugGrid[i1].taken = drugGrid[i1].taken + " / Night" 
                } else {
                    drugGrid[i1].taken = "Night"
                }
            }
        }
        return(drugGrid);
    },
    
    // Adds a drug to the current prescription
    addDrug: function() {
        // TODO: What happens if you submit when there's a blank or partial drug??
        var nowDate = new Date();
        var nowDate_string = nowDate.toISOString();
        var date = nowDate_string.split("T");
        var newDrug;
        Ext.getStore('orderStore').add({
            date: date[0],
            drugname: '',
            dosage: '',
            duration: '',
            unitprice: '',
            itemprice: ''
        });
    },
    
    // When a patient from the queue is clicked, this function makes the orders appear
    showQueuedPatient: function(selection, record) {
        // TODO: fetching index, but does nothing... should it?
        record.data.encounters[record.data.encounters.length-1];
    },
    
    displayForm: function () {
        var newPres = Ext.getCmp('newPatient');
        newPres.show();
    },

    fillPrescription: function() {
        var controller = this;
        Ext.Msg.confirm("Confirmation", "Are you sure you want to fill prescription?", function (btn) {
            if (btn == 'yes') {
                var l = Ext.getCmp('mainarea').getLayout();
                l.setActiveItem(0);
                Ext.getCmp('drugASearchGrid').getStore().removeAll();
                Ext.getCmp('prescriptionDate').setValue('');
            } else {
                controller.printPrescribedDrugs();
            }
        });
    },
    
    savePerson: function () {
        if(Ext.getCmp('givenName').isValid() && Ext.getCmp('familyName').isValid() && Ext.getCmp('age').getValue() !== null)  
        { 
            var jsonperson = Ext.create('RaxaEmr.Pharmacy.model.Person', {
                gender: Ext.getCmp('sexRadioGroup').getChecked()[0].boxLabel.charAt(0),
                names: [{
                    givenName: Ext.getCmp('givenName').value,
                    familyName: Ext.getCmp('familyName').value
                }],
                attributes: []
            });
            if (Ext.getCmp('age').getValue() !== null) {
                jsonperson.data.age = Ext.getCmp('age').value;
                RaxaEmr.Pharmacy.model.Person.getFields()[2].persist = true;
            } else {
                RaxaEmr.Pharmacy.model.Person.getFields()[2].persist = false;
            }
            var store = Ext.create('RaxaEmr.Pharmacy.store.Persons');
            store.add(jsonperson);
            var attributes = [
            {
                componentId: 'patientPrimaryContact', 
                uuid: localStorage.primaryContactUuidpersonattributetype
            },

            {
                componentId: 'patientSecondaryContact', 
                uuid: localStorage.secondaryContactUuidpersonattributetype
            }
            ];
            var addAttribute = function (componentId, attributeTypeUuid) {
                jsonperson.data.attributes.push({
                    value: Ext.getCmp(componentId).getValue(),
                    attributeType: attributeTypeUuid
                });
            };
            for (var i = 0; i < attributes.length; i++) {
                addAttribute(attributes[i].componentId, attributes[i].uuid );
            }
        
            // this statement makes the post call to make the person
            store.sync({
                scope: this,
                success: function(response){
                    this.getidentifierstype(store.getAt(0).getData().uuid);
                // this statement calls getifentifiers() as soon as the post call is successful
                //Ext.getCmp('addPatient').getForm().reset();
                },
                failure: function(){
                    Ext.Msg.alert("Error", Util.getMessageSyncError());
                }
            });
            //I made this funtion return this store because i needed this in jasmine unit test
            return store;
        }
        else{
            Ext.Msg.alert('fields invalid');
            return null;
        }
    },

    getidentifierstype: function (personUuid) {
        var identifiers = Ext.create('RaxaEmr.Pharmacy.store.Identifiers');
        identifiers.load({
            scope: this,
            callback: function(records, operation, success){
                if(success){
                    this.getlocation(personUuid, identifiers.getAt(0).getData().uuid);
                }
                else{
                    Ext.Msg.alert("Error", Util.getMessageLoadError());
                }
            }
        });
    },

    // Makes a get call to get the location uuid
    getlocation: function (personUuid, identifierType) {
        var locations = this.getStore('Locations');
        locations.load({
            scope: this,
            callback: function(records, operation, success){
                if(success){
                    this.makePatient(personUuid, identifierType, locations.getAt(0).getData().uuid);
                }
                else{
                    Ext.Msg.alert("Error", Util.getMessageLoadError());
                }
            }
        });
    },

    // Makes a post call to create the patient
    makePatient: function (personUuid, identifierType, location) {
        var patient = Ext.create('RaxaEmr.Pharmacy.model.Patient', {
            person: personUuid,
            identifiers: [{
                identifier: Util.getPatientIdentifier().toString(),
                identifierType: identifierType,
                location: location,
                preferred: true
            }]
        });
        var PatientStore = Ext.create('RaxaEmr.Pharmacy.store.Patients');
        PatientStore.add(patient);
        RaxaEmr.Pharmacy.model.Patient.getFields()[3].persist = false;
        RaxaEmr.Pharmacy.model.Patient.getFields()[4].persist = false;
        RaxaEmr.Pharmacy.model.Patient.getFields()[5].persist = false;
        //makes the post call for creating the patient
        PatientStore.sync({
            scope: this,
            callback: function(){
                RaxaEmr.Pharmacy.model.Patient.getFields()[3].persist = true;
                RaxaEmr.Pharmacy.model.Patient.getFields()[4].persist = true;
                RaxaEmr.Pharmacy.model.Patient.getFields()[5].persist = true;
            },
            success: function(response){
                var personStore = Ext.getStore('personStore');
                var patientStore = Ext.getStore('patientStore');
                Ext.Msg.alert("Patient successfully created");
                Ext.getCmp('newPatient').getForm().reset();
                Ext.getCmp('newPatient').hide();
                var patientDetails = {
                    name :  patientStore.data.items[0].data.name,
                    age : patientStore.data.items[0].data.age,
                    uuid : patientStore.data.items[0].data.uuid,
                    gender : personStore.data.items[0].data.gender,
                    identifier : patientStore.data.items[0].data.identifiers[0].display.split(" = ")[1]
                } 
                this.patientSelect(patientDetails);
            },
            failure: function(){
                Ext.Msg.alert("Error", Util.getMessageSyncError());
            }
        });
    },
    
    // TODO: Move to utils
    ISODateString: function (d) {
        function pad(n) {
            return n < 10 ? '0' + n : n;
        }
        return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
    },
    
    sendPharmacyEncounter: function(uuid, typeOfEncounter) {
        concept = [];
        order = [];
        var conceptsSent = 0, conceptsReceived = 0;
        var drugs = Ext.getStore('orderStore').data;
        var numDrugs = drugs.items.length;
        for (var i1 = 0; i1 < numDrugs; i1++) {
            // value of Url for get call is made here using name of drug
            if(!Ext.getCmp("saveLoadMask")){
                var myMask = new Ext.LoadMask(Ext.getCmp('prescribedDrugs'), {
                    msg:"Saving",
                    id:"saveLoadMask"
                });
            }
            Ext.getCmp("saveLoadMask").show();
            if(drugs.items[i1].data.orderUuid !== "") {
                Ext.Ajax.request({
                    url: HOST + '/ws/rest/v1/order/' + drugs.items[i1].data.orderUuid + '?!purge',  //'/ws/rest/v1/concept?q=height',
                    method: 'DELETE',
                    disableCaching: false,
                    headers: Util.getBasicAuthHeaders(),
                    failure: function (response) {
                        console.log('GET failed with response status: ' + response.status); // + response.status);
                    },
                    success: function (response) {
                        console.log("Drugs successfully deleted : " + response.status);
                    }
                });
            } 
            var drugData = drugs.items[i1].data;
            if(drugData.drugName !== "") {
                var Url = HOST + '/ws/rest/v1/raxacore/drug/';
                Url = Url + drugData.drugUuid;
                concept.push(Ext.create('RaxaEmr.Pharmacy.store.drugConcept'));
                // setting up the proxy for store with the above Url
                concept[conceptsSent++].setProxy({
                    type: 'rest',
                    url: Url,
                    headers: Util.getBasicAuthHeaders(),
                    reader: {
                        type: 'json'
                    }
                });
                var startdate = new Date();
                // value of end date depending on the duration in days
                // TODO: Will this work? If you are adding "days" via drugData.duration and initially day was 31 + 5 days .. e.g. how would it handle the 36th of March?
                var enddate = new Date(startdate.getFullYear(), startdate.getMonth(), startdate.getDate() + drugData.duration);
                // model for drug order is created here
                var newDosage = drugData.dosage.toFixed(2);
                var newInstructions = drugData.instructions;
                if(drugData.takeInMorning){
                    newInstructions += Util.Taken_Morning;
                }
                if(drugData.takeInDay){
                    newInstructions += Util.Taken_Day;  
                }
                if(drugData.takeInEvening){
                    newInstructions += Util.Taken_Even;
                }
                if(drugData.takeInNight){
                    newInstructions += Util.Taken_Night;
                }
                order.push({
                    patient: uuid,
                    drug: drugData.drugUuid,
                    instructions: newInstructions,
                    startDate: startdate,
                    autoExpireDate: enddate,
                    dose: newDosage,
                    quantity: drugData.qty,
                    frequency: drugData.frequency,
                    units: drugData.units,
                    // type should be "drugorder" in order to post a drug order
                    type: 'drugorder'
                });
                // here it makes the get call for concept of related drug
                concept[i1].load({
                    scope: this,
                    // TODO: This function is being created inside a loop. Fix.
                    callback: function(records, operation, success){
                        if(success){
                            // added a counter k which increment as a concept load successfully, after all the concept are loaded
                            // value of k should be equal to the no. of drug forms
                            conceptsReceived++;
                            if (conceptsSent === numDrugs && conceptsReceived === numDrugs) {
                                for (var j = 0; j < concept.length; j++) {
                                    order[j].concept = concept[j].getAt(0).getData().concept;
                                }
                                var time = Util.Datetime(new Date());
                                // model for posting the encounter for given drug orders
                                //setting 'orders' in the encounter to be sent
                                RaxaEmr.Pharmacy.model.drugEncounter.getFields()[5].persist = true;
                                var encounter = Ext.create('RaxaEmr.Pharmacy.model.drugEncounter', {
                                    patient: uuid,
                                    // this is the encounter for the prescription encounterType
                                    encounterType: typeOfEncounter,
                                    encounterDatetime: time,
                                    orders: order,
                                    provider: localStorage.loggedInUser
                                });
                                var encounterStore = Ext.create('RaxaEmr.Pharmacy.store.drugEncounter');
                                encounterStore.add(encounter);
                                // make post call for encounter
                                encounterStore.sync({
                                    scope: this,
                                    success: function(){
                                        if(Ext.getCmp("saveLoadMask") !== undefined) {
                                            Ext.getCmp("saveLoadMask").hide();
                                        }
                                        Ext.Msg.alert('Successful');
                                        var l = Ext.getCmp('mainarea').getLayout();
                                        l.setActiveItem(0);
                                        var l1 = Ext.getCmp('addpatientarea').getLayout();
                                        l1.setActiveItem(0);
                                        //  l2.setActiveItem(0);
                                        // Ext.getCmp('drugASearchGrid').getStore().removeAll();
                                        Ext.getCmp('prescriptionDate').setValue('');
                                        Ext.getStore('orderStore').removeAll();
                                        this.sendPrescriptionFill();
                                    },
                                    failure: function(){
                                        if(Ext.getCmp("saveLoadMask") !== undefined) {
                                            Ext.getCmp("saveLoadMask").hide();
                                        }
                                        Ext.Msg.alert("Failure -- Please try again");
                                         
                                    }
                                });
                            }
                        }
                        else{
                            if(Ext.getCmp("saveLoadMask") !== undefined) {
                                Ext.getCmp("saveLoadMask").hide();
                            }
                            Ext.Msg.alert("Error: failed to read from server");
                        }
                    }
                });
            }
            else{
                if(Ext.getCmp("saveLoadMask") !== undefined) {
                    Ext.getCmp("saveLoadMask").hide();
                }
                Ext.Msg.alert('Error: enter a drug');
                return;
            }
        }
    },
    
    //fuction to be called when a drug or
    //
    //der is selected in prescription grid of advanced search
    //sets the prescription date and store for main prescription grid
    //DrugOrderSelect: function(x) {
    DrugOrderSelect: function(x , filterStartDate) {
        var l = Ext.getCmp('mainarea').getLayout();
        l.setActiveItem(0);
        this.setOrderStore(x , filterStartDate);
        console.log(x);
        if(x.getData().orderer){
            Ext.getCmp('prescriptionDoctor').setValue(x.getData().orderer);
        }
        else{
            Ext.getCmp('prescriptionDoctor').setValue(null);
        }
        Ext.getCmp('prescriptionDate').setValue(x.getData().startDate.toLocaleDateString());
    },

    setOrderStore : function(x , filterStartDate) {
        console.log(x);
        var units;
        var frequencyOpdStack = "q.a.d. q.a.m. q.d.s. q.p.m. q.h. q.h.s. q.1 h, q.1° q.d., q1d q.i.d. q4PM q.o.d. qqh q.s. QWK t.d.s. t.i.d. t.i.w."
        var freqMeans;
        var drugName;
        var docInstruction;
        var replacedStrng;
        var takeInMorning = false;
        var takeInDay = false;
        var takeInEvening = false;
        var takeInNight = false;
        if(x.data.instructions.indexOf(Util.Taken_Morning) !== -1) {
            if( replacedStrng !== undefined ) {
                takeInMorning = true;
                replacedStrng = (x.data.instructions.replace(Util.Taken_Morning , ""))
            } else 
{
                takeInMorning = true;
                replacedStrng = (x.data.instructions.replace(Util.Taken_Morning , ""))
            }
        }
        if(x.data.instructions.indexOf(Util.Taken_Day) !== -1) {
            if( replacedStrng !== undefined) {
                takeInDay = true;
                replacedStrng = replacedStrng.replace(Util.Taken_Day , '')
            } else {
                takeInDay = true;
                replacedStrng =  (x.data.instructions.replace(Util.Taken_Day , ''))
            }
        }
        if(x.data.instructions.indexOf(Util.Taken_Even) !== -1) {
            if( replacedStrng !== undefined) {
                takeInEvening = true;
                replacedStrng = replacedStrng.replace(Util.Taken_Even , '')
            } else {
                takeInEvening = true;
                replacedStrng = (x.data.instructions.replace(Util.Taken_Even , ''))
            }
        }
        if(x.data.instructions.indexOf(Util.Taken_Night) !== -1) {
            if( replacedStrng !== undefined) {
                takeInNight = true;
                replacedStrng = replacedStrng.replace(Util.Taken_Night , '')
            } else {
                takeInNight = true;
                replacedStrng = (x.data.instructions.replace(Util.Taken_Night,''))
            }
        }
        if(x.data.instructions.indexOf('#specificReqFlag#') !== -1) {
            var freqRouteAdmin = x.data.instructions.split('#specificReqFlag#');
            drugName = x.data.drugname+" ( "+freqRouteAdmin[1]+" ) ";
            var instMean = this.getDrugAbbreviate(freqRouteAdmin[0]);
            var unitsDur = x.data.units;
            units = unitsDur;
            x.data.instructions = instMean;
        } else {
            drugName = x.data.drugname;
            units = x.data.dosage;
        }
        if(replacedStrng !== undefined) {
            docInstruction = replacedStrng;
        } else {
            docInstruction  = x.data.instructions;
        }
        if(frequencyOpdStack.indexOf(x.data.frequency) >= 0 || this.getDrugAbbreviate(x.data.frequency) !== undefined) {
            freqMeans = this.getDrugAbbreviate(x.data.frequency);
            Ext.getCmp('timesActionId').hide();
            Ext.getCmp('frequencyTimesId').show();
        } else {
            freqMeans = x.data.frequency;
        }
        Ext.getStore('orderStore').add({
            drugName: drugName,
            qty: x.data.quantity,
            dosage: units,
            drugUuid: x.data.drugUuid,
            duration: Util.daysBetween(x.data.startDate, x.data.endDate),
            instructions: docInstruction,
            takeInMorning: takeInMorning,
            takeInDay: takeInDay,
            takeInEvening: takeInEvening,
            takeInNight: takeInNight,
            date: x.data.date,
            orderUuid: x.data.orderUuid,
            frequency: freqMeans,
            orderer: x.orderer
        });
        var orderStore = Ext.getStore('orderStore');
        orderStore.filter(function(r) {
            var value = r.get('date');
            return (value === filterStartDate);
        });
        Ext.getStore('orderStore').group('date');
    },
    // Function to be call when a patient is selected in the patient search results gird of advanced search
    // Sets the fields realted to patient in main screen and then calls for function getDrugOrders()
    patientSelect: function (x, searchPanel) {
        console.log(x);
        Ext.getCmp('currentButton').toggle(true);
        Ext.getCmp('historyButton').toggle(false);
        Ext.getCmp('prescriptionPatientName').setValue(x.name);
        //below its commented as the identifier are not sent in patient search results
        Ext.getCmp('prescriptionPatientId').setValue(x.identifier)
        if (x.age !== 0) {
            Ext.getCmp('prescriptionPatientAge').setValue(x.age);
        }
        else {
            Ext.getCmp('prescriptionPatientAge').setValue(null);
        }
        Ext.getCmp('prescriptionPatientGender').setValue(x.gender);
        localStorage.setItem('person', x.uuid);
        this.getDrugOrders(x.uuid, searchPanel);
    },

    getDrugAbbreviate : function(abbreviate) {
        switch(abbreviate)
        {
            case 'q.a.d.':
            case 'every other day':
                return 'every other day';
                break;
            case 'q.a.m.':
            case 'every day before noon':
                return 'every day before noon';
                break;
            case 'q.d.s.':
            case 'four times a day':
                return 'four times a day';
                break;
            case 'q.p.m.':
            case  'every day after noon':
                return 'every day after noon';
                break;
            case 'q.h.':
            case  'every hour':
                return 'every hour';
                break;
            case 'q.h.s.':
            case 'every night at bedtime':
                return 'every night at bedtime';
                break;
            case 'q.1 h, q.1°':
            case 'every 1 hour; (can replace "1" with other numbers)':
                return 'every 1 hour; (can replace "1" with other numbers)';
                break;    
            case 'q.d., q1d':
            case  'every day':
                return 'every day';
                break;
            case 'q.i.d.':
            case 'four times a day':
                return 'four times a day';
                break;
            case 'q4PM':
            case 'at 4pm':
                return 'at 4pm';
                break;
            case 'q.o.d.':
            case 'every other day':
                return 'every other day';
                break;
            case 'qqh':
            case 'every four hours':
                return 'every four hours';
                break;  
            case 'q.s.':
            case 'a sufficient quantity':
                return 'a sufficient quantity';
                break; 
            case 'QWK':
            case 'every week':
                return 'every week';
                break; 
            case 't.d.s.':
            case 'three times a day':
                return 'three times a day';
                break; 
            case 't.i.d.':
            case 'three times a day':
                return 'three times a day';
                break; 
            case 't.i.w.':
            case 'three times a week':
                return 'three times a week';
                break;   
            case 'p.c.':
            case 'after meals':
                return 'after meals';
                break;
            case 'ex aq':
            case 'in water':
                return 'in water';
                break;
            case 'cc':
            case 'with food, (but also cubic centimetre)':
                return 'with food, (but also cubic centimetre)';
                break;
            case 'cf':
            case 'with food':
                return 'with food';
                break;
            case 'NBO? (nil by oral)':
            case 'without food':
                return 'without food';
                break;
        }
    },
    
    
    
    
    //function for the get call for drugorder for related patient
    getDrugOrders: function (x, searchPanel) {
        var that = this;
        if(searchPanel !== undefined) {
        
            if(!Ext.getCmp("searchLoadMask")){
                var myMask = new Ext.LoadMask(Ext.getCmp(searchPanel), {
                    msg:"Searching",
                    id:"searchLoadMask"
                });
            }
            Ext.getCmp("searchLoadMask").show();
        }
        Ext.getStore('orderStore').removeAll();
        var Url = HOST + '/ws/rest/v1/raxacore/order?patient=';
        Url = Url + x + '&&v=full';
        // setting up the proxy here because url is not fixed
        var drudOrderStore = Ext.getStore('drugOrder')
        if( drudOrderStore === undefined ) {
            drudOrderStore = Ext.create('RaxaEmr.Pharmacy.store.drugOrderSearch')
        }
        drudOrderStore.setProxy({
            type: 'rest',
            url: Url,
            headers: Util.getBasicAuthHeaders(),
            reader: {
                type: 'json',
                root: 'results'
            }
        });
        drudOrderStore.sort({
            property: 'startDate', 
            direction : 'DESC'
        });
        drudOrderStore.load({
            scope: this,
            sortOnLoad: true,
            callback: function(records, operation, success){
                if(Ext.getCmp("searchLoadMask") !== undefined) {
                    Ext.getCmp("searchLoadMask").hide();
                }
                if(success){
                    if(records.length > 0){
                        var filterStartDate = drudOrderStore.data.items[0].data.date;
                        for(var i = 0 ; i < drudOrderStore.data.length ; i++) {
                            console.log(drudOrderStore.data.items[i]);
                            that.DrugOrderSelect(drudOrderStore.data.items[i] , filterStartDate)
                        }
                    }
                    else{
                        if(searchPanel !== undefined) { 
                            Ext.Msg.alert("Results", "No prescriptions found for patient")
                            Ext.getCmp('timesActionId').show();
                            Ext.getCmp('frequencyTimesId').hide();
                        }
                       
                    }
                }
                else{
                    Ext.Msg.alert("Error", Util.getMessageLoadError());
                }
            }
        });
    },
    
    searchFilteredPatient: function(searchPanel, nameField, searchGrid) {
        // makes the Get call for the patient list
        Ext.getCmp(searchGrid).getStore().filterBy(function(record){
            if(record.data.display.toLowerCase().indexOf(Ext.getCmp(nameField).getValue().toLowerCase())!==-1){
                return true;
            }
            return false;
        });
    },

    // Function that make the get call when enter is pressed within any of the 3 text fieds in advanced search
    searchPatient: function (nameField, searchGrid) {
        if(!Ext.getCmp("searchLoadMask")){
            var myMask = new Ext.LoadMask(Ext.getCmp(searchGrid), {
                msg:"Searching",
                id:"searchLoadMask"
            });
        }
        Ext.getCmp("searchLoadMask").show();
        if (Ext.getCmp(nameField).getValue() !== "") {
            // setting up url with the query for given patient name
            var Url = HOST + '/ws/rest/v1/patient?q=' + Ext.getCmp(nameField).getValue() + "&v=full";
            // setting up the proxy here because url is not fixed
            Ext.getCmp(searchGrid).getStore().setProxy({
                type: 'rest',
                url: Url,
                headers: Util.getBasicAuthHeaders(),
                reader: {
                    type: 'json',
                    root: 'results'
                }
            });
            // makes the Get call for the patient list
            Ext.getCmp(searchGrid).getStore().load({
                scope: this,
                callback: function(records, operation, success){
                    if( records === null || records.length <= 0 ) {
                        Ext.Msg.alert("Results" , "No Patient Found With The Given Name");
                        Ext.getCmp(nameField).setValue("");
                    }
                    if(success){
                        Ext.getCmp("searchLoadMask").hide();
                    }
                    else{
                        Ext.getCmp("searchLoadMask").hide();
                        Ext.Msg.alert("Error", Util.getMessageLoadError());
                    }
                }
            });
        }
    },

    ////////////////////////////
    // Inventory
    ////////////////////////////

    // Navigate to Inventory: Stock >> Overview
    navigateInventoryOverview: function() {
        var target = RaxaEmr_Pharmacy_Controller_Vars.INVENTORY_PAGES.OVERVIEW.value;
        Ext.getCmp('inventoryMainArea').getLayout().setActiveItem(target);
        this._updateHighlightedButtonInventoryNavBar('inventoryOverviewButton');
    },
        
    // Navigate to Inventory: Orders >> Request Drugs
    newRequisition: function() {
        var target = RaxaEmr_Pharmacy_Controller_Vars.INVENTORY_PAGES.REQUISITION.value;
        Ext.getCmp('inventoryMainArea').getLayout().setActiveItem(target);
        this._updateHighlightedButtonInventoryNavBar('newRequisitionButton');
    },

    // Navigate to Inventory: Orders >> Send Drugs
    newIssue: function(){
        var target = RaxaEmr_Pharmacy_Controller_Vars.INVENTORY_PAGES.ISSUE.value;
        Ext.getCmp('inventoryMainArea').getLayout().setActiveItem(target);
        this._updateHighlightedButtonInventoryNavBar('newIssueButton');
    },
    
    // Navigate to Inventory: Orders >> Update Stock (receive drugs)
    newReceipt: function() {
        var target = RaxaEmr_Pharmacy_Controller_Vars.INVENTORY_PAGES.RECEIPT.value;
        Ext.getCmp('inventoryMainArea').getLayout().setActiveItem(target);
        this._updateHighlightedButtonInventoryNavBar('newReceiptButton');
    },

    // Helper to track current position of user in Inventory UI
    _updateHighlightedButtonInventoryNavBar: function(id) {
        var btns = ['inventoryOverviewButton', 'newRequisitionButton', 'newIssueButton', 'newReceiptButton'];
        for (var i=0; i < btns.length; i++) {

            Ext.getCmp(btns[i]).toggle(false);
        }
        Ext.getCmp(id).toggle(true);
    },

    // Fills a purchase order when a stock admin wants to make a new issue
    // Populates issue drug fields with drugs + quantites from the purchase order
    populateReceiptFromPurchaseOrder: function(combo, records){
        console.log(records[0]);
        //emptying previous fields
        Ext.getStore('newReceipt').removeAll();
        Ext.ComponentQuery.query('goodsReceiptGrid')[0].getSelectionModel().deselectAll();
        var purchaseOrderUuid = Ext.getCmp('issuePurchaseOrderPicker').getValue();
        for(var i=0; i < records[0].data.inventories.length; i++){
            // For each inventory, populate the drug name and quantity
            var currDrugUuid = records[0].data.inventories[i].drug.uuid;
            var currDrugName = records[0].data.inventories[i].drug.display;
            //TODO: add in drug name to receipt
            //var currDrugIndex = Ext.getStore('allDrugs').find('uuid', currDrugUuid);
            
            Ext.getStore('newReceipt').add({
                drug: {
                    text: 'currDrugName',
                    uuid: currDrugUuid
                },
                batch: records[0].data.inventories[i].batch,
                quantity: records[0].data.inventories[i].quantity,
                originalQuantity: records[0].data.inventories[i].originalQuantity,
                //drugName: records[0].data.inventories[i].drug.display,
                expiryDate: records[0].data.inventories[i].expiryDate,
                uuid: records[0].data.inventories[i].uuid,
                supplier: records[0].data.inventories[i].supplier
            })[0];
        }
        //setting value so that store keeps same filter -- otherwise will stop listening
        Ext.getCmp('receiptPurchaseOrderPicker').setValue(records[0]);
    },
    
    submitReceipt: function(){
        var drugInventories = [];
        var receipts = Ext.getStore('newReceipt').data;
        var receiptLocationUuid = localStorage.location;
        var stockLocationUuid = localStorage.stockLocation;
        var receiptLocationString = localStorage.locationName;
        var purchaseOrderUuid = Ext.getCmp('receiptPurchaseOrderPicker').getValue();
        for (var i = 0; i < receipts.items.length; i++) {
            if(receipts.items[i].data.drugname !== ""){
                // Get index of drug in store
                var drugIndex = Ext.getStore('allDrugs').find('text', receipts.items[i].data.drugName);
                // Create drug inventory model
                var expiryDate = new Date(receipts.items[i].data.expiryDate + ' GMT-0600');
                drugInventories.push({
                    status: RaxaEmr_Pharmacy_Controller_Vars.STOCK_STATUS.AVAILABLE,
                    // Get drug uuid
                    drug: Ext.getStore('allDrugs').getAt(drugIndex).data.uuid,
                    quantity: receipts.items[i].data.quantity,
                    batch: receipts.items[i].data.batch,
                    originalQuantity: receipts.items[i].data.quantity,
                    expiryDate: Util.Datetime(expiryDate),
                    roomLocation: receipts.items[i].data.roomLocation,
                    location: receiptLocationUuid,
                    supplier: receipts.items[i].data.supplier
                });
                if(purchaseOrderUuid!==null){
                    drugInventories[i].uuid = receipts.items[i].data.uuid;
                }
            }
        }
        var time = Util.getCurrentTime();   // TODO: Deal with server/front-end mismatch for time zone. All time should be handled by server, if possible. Client can just adjust relative to say, GMT, by adding/subtracting in as "sugar" in UI. But nothing in db should be affected.
        // model for posting the encounter for given drug orders
        var purchaseOrder = Ext.create('RaxaEmr.Pharmacy.model.PurchaseOrder', {
            name: "Pharmacy Receipt",
            description: "Receipt at "+receiptLocationString+ " on "+time.toString().substr(0, 10),
            received: "true",
            provider: Util.getLoggedInProviderUuid(),
            stockLocation: stockLocationUuid,
            dispenseLocation: receiptLocationUuid,
            drugPurchaseOrderDate: time,
            inventories: drugInventories
        });
        var purchaseOrderStore = Ext.create('RaxaEmr.Pharmacy.store.PurchaseOrders');
        purchaseOrderStore.add(purchaseOrder);
        // make post call for encounter
        if(purchaseOrderUuid!==null){
            purchaseOrderStore.getProxy().url = HOST + '/ws/rest/v1/raxacore/drugpurchaseorder/'+purchaseOrderUuid;
        }
        Ext.getCmp('submitReceiptButton').disable();
        purchaseOrderStore.sync({
            scope: this,
            success: function(){
                purchaseOrderStore.getProxy().url = HOST + '/ws/rest/v1/raxacore/drugpurchaseorder';
                Ext.getStore('StockList').load();
                Ext.getCmp('allStockGrid').getView().refresh();
                Ext.getStore('batches').load();
                Ext.getStore('newReceipt').removeAll();
                Ext.Msg.alert('Successful');
                Ext.getCmp('submitReceiptButton').enable();
            },
            failure: function(){
                purchaseOrderStore.getProxy().url = HOST + '/ws/rest/v1/raxacore/drugpurchaseorder';
                Ext.getCmp('submitReceiptButton').enable();
                Ext.Msg.alert('Error: unable to write to server');
            }
        });
    },
    
    // Generate pop-up which allows user to add a new drug
    newDrug : function() {
        Ext.getCmp('addDrug').show();
    },
    
    cancelNewDrug : function() {
        Ext.getCmp('addDrug').hide();
    },
    
    submitNewDrug: function() {
        Ext.getCmp('addDrug').hide();
        //getting drug concept from OpenMRS
        // TODO: We shouldn't fetch the drug concept dynamically every time we post a drug
        //  Instead, it should be one of the concepts we fetch in startup.js and util.js during login
        Ext.Ajax.request({
            url: HOST + '/ws/rest/v1/concept?q='+Ext.getCmp('addDrugName').getValue()+"&v=full",
            method: 'GET',
            disableCaching: false,
            headers: Util.getBasicAuthHeaders(),
            success: function (response) {
                var jsonResponse = Ext.decode(response.responseText);
                var j=0;
                var foundDrugConcept = false;
                while(j<jsonResponse.results.length && !foundDrugConcept){
                    if (jsonResponse.results[j].conceptClass.description === "Drug"){
                        foundDrugConcept = true;
                        this._postNewDrug(jsonResponse.results[j].uuid);
                    }
                    j++;
                }
                if(!foundDrugConcept){
                    //we need to make the concept as we didn't find it
                    this.postConceptForNewDrug();
                }
            },
            failure: function() {
                Ext.Msg.alert("Error", Util.getMessageSyncError());
            },
            scope: this
        });
    },

    // Helper to assist in REST call, which creates new drugs in OpenMRS db
    _postNewDrug: function(conceptUuid) {
        var newDrugInfo = {
            name: Ext.getCmp('addDrugManufacturer').getValue(),
            description: Ext.getCmp('addDrugSupplier').getValue(),
            cost: Ext.getCmp('addDrugCost').getValue(),
            price: Ext.getCmp('addDrugPrice').getValue()
        };
        var newDrug = {
            concept: conceptUuid,
            name: Ext.getCmp('addDrugName').getValue(),
            dosageForm: Ext.getCmp('dosageFormPicker').getValue(),
            minimumDailyDose: Ext.getCmp('addDrugMinimumDose').getValue(),
            maximumDailyDose: Ext.getCmp('addDrugMaximumDose').getValue(),
            units: Ext.getCmp('addDrugUnits').getValue(),
            drugInfo: newDrugInfo
        };
        var newDrugParam = Ext.encode(newDrug);
        Ext.Ajax.request({
            url: HOST + '/ws/rest/v1/raxacore/drug',
            method: 'POST',
            params: newDrugParam,
            disableCaching: false,
            headers: Util.getBasicAuthHeaders(),
            success: function (response) {
                Ext.getStore('allDrugs').load();
                Ext.getStore('DrugInfos').load();
                Ext.Msg.alert('Drug created successfully');
            },
            failure: function (response) {
                Ext.Msg.alert('Error: unable to write to server. Enter all fields.');
            },
            scope: this
        });
    },

    postConceptForNewDrug: function(){
        // TODO: I don't think there's any reason to create this concept dynamically.
        //  Instead, it should be a required concept which is loaded into OpenMRS when
        //  the RaxaCore module is installed
        var newConcept = {
            names: [{
                name: Ext.getCmp('addDrugName').getValue(), 
                locale: "en", 
                conceptNameType: "FULLY_SPECIFIED"
            }],
            datatype: localStorage.drugConceptDataTypeUuid,
            conceptClass: localStorage.drugConceptClassUuid
        };
        var newConceptParam = Ext.encode(newConcept);
        Ext.Ajax.request({
            url: HOST + '/ws/rest/v1/concept',
            method: 'POST',
            params: newConceptParam,
            disableCaching: false,
            headers: Util.getBasicAuthHeaders(),
            success: function (response) {
                var jsonResponse = Ext.decode(response.responseText);
                this._postNewDrug(jsonResponse.uuid);
            },
            failure: function() {
                Ext.Msg.alert("Error", Util.getMessageSyncError());
            },
            scope: this
        });
    },

    //these Uuids should go into Util with the other resources, however OpenMRS has a bug that doesnt allow
    //searching on conceptdatatype and conceptclass...so they will come into here for now.
    // TODO: move them into Util once OpenMRS allows searching on these. (N: can we do this now?)
    //  -- what's different about fetching here vs in util.js?
    //  -- cant we just add this as an additional lookup and specify that conceptdatatype and conceptclass
    //      need to be handled specially?
    _getStartupUuids: function(){
        if(!localStorage.drugConceptClassUuid || !localStorage.drugConceptDataTypeUuid){
            Ext.Ajax.request({
                url: HOST + '/ws/rest/v1/conceptclass',
                method: 'GET',
                disableCaching: false,
                headers: Util.getBasicAuthHeaders(),
                success: function (response) {
                    var jsonResponse = Ext.decode(response.responseText);
                    for(var i=0; i<jsonResponse.results.length; i++){
                        if(jsonResponse.results[i].display === "Drug - Drug"){
                            localStorage.setItem('drugConceptClassUuid', jsonResponse.results[i].uuid);
                            Ext.Ajax.request({
                                url: HOST + '/ws/rest/v1/conceptdatatype',
                                method: 'GET',
                                disableCaching: false,
                                headers: Util.getBasicAuthHeaders(),
                                // TODO: dont make functions within a loop
                                success: function(response) {
                                    var jsonResponse = Ext.decode(response.responseText);
                                    for(var j=0; j<jsonResponse.results.length; j++){
                                        if(jsonResponse.results[j].display === "N/A - Not associated with a datatype (e.g., term answers, sets)"){
                                            localStorage.setItem('drugConceptDataTypeUuid', jsonResponse.results[j].uuid);
                                        }
                                    }
                                },
                                scope: this
                            });
                        }
                    }
                }, 
                scope: this
            });
        }
    },

    //creates new drug group
    newDrugGroup: function() {
    // TODO
    },
    
    // Submit Drug Request via REST to database  
    submitRequisition: function(){
        // Create Drug Inventories (??)
        if(!(localStorage.location===null || Ext.getCmp('stockLocationPicker').value === undefined  || Ext.getCmp('stockLocationPicker').value === null )) {
            var drugInventories = [];
            var requisitions = Ext.getStore('RequisitionItems').data;
            for (var i = 0; i < requisitions.items.length; i++) {
                // value of Url for get call is made here using name of drug
                if(requisitions.items[i].data.drugname !== ""){
                    var drugIndex = Ext.getStore('allDrugs').find('text', requisitions.items[i].data.drugname);
                    var startdate = Util.getCurrentTime();
                    drugInventories.push({
                        // Model for drug inventory
                        status: RaxaEmr_Pharmacy_Controller_Vars.STOCK_STATUS.ORDERED,
                        drug: Ext.getStore('allDrugs').getAt(drugIndex).data.uuid,
                        quantity: requisitions.items[i].data.quantity
                    });
                }
            }

            // Create model for Purchase Order POST, with given drug orders
            var currentTime = new Date();
            var timeOfDay;
            var currentDate =  currentTime.getDate() + 1 + "/" + currentTime.getMonth() +1 + "/" + currentTime.getFullYear();
            if(currentTime.getHours() > 11) {
                timeOfDay = currentTime.getHours() + ":" + currentTime.getMinutes()+ "PM";
            } else {
                timeOfDay = currentTime.getHours() + ":" + currentTime.getMinutes()+ "AM";    
            }
            var stockLocationIndex = Ext.getStore("Locations").find('uuid', Ext.getCmp("stockLocationPicker").value);
            var dispenseLocationString = localStorage.locationName;
            var stockLocationString = Ext.getStore("Locations").getAt(stockLocationIndex).data.name.toString();
            // Model for posting the encounter for given drug orders
            var purchaseOrder = Ext.create('RaxaEmr.Pharmacy.model.PurchaseOrder', {
                name: "Pharmacy Requisition",
                description: "Requisition from "+dispenseLocationString+ " to " + stockLocationString+ " on " +this.getCurrentDate()+ " at " + this.getCurrentTime(),
                received: "false",
                provider: Util.getLoggedInProviderUuid(),
                stockLocation: Ext.getStore("Locations").getAt(stockLocationIndex).data.uuid,
                dispenseLocation: localStorage.location,
                drugPurchaseOrderDate: Util.getCurrentTime(),
                inventories: drugInventories
            });
        
            // Post the encounter
            var purchaseOrderStore = Ext.create('RaxaEmr.Pharmacy.store.PurchaseOrders');
            purchaseOrderStore.add(purchaseOrder);
            purchaseOrderStore.sync({
                scope: this,
                success: function(){
                    // Send an alert that requisition has been made
                    var alertParams = {
                        name: "Requisition from "+dispenseLocationString+ " to " + stockLocationString + " on " +this.getCurrentDate()+ " at " + this.getCurrentTime(),
                        toLocation: Ext.getStore("Locations").getAt(stockLocationIndex).data.uuid,
                        providerSent: Util.getLoggedInProviderUuid(),
                        alertType: "newRequisition",
                        defaultTask: "newIssue",
                        time: Util.getCurrentTime()
                    };
                    Util.sendAlert(alertParams);    // TODO: This util function should handle the alert button UI.. whenever unread alerts, UI should note it
                    Ext.getStore('StockList').load();
                    Ext.getCmp('allStockGrid').getView().refresh();
                    Ext.getStore('fillRequisitions').load();
                    Ext.Msg.alert('Successful');
                    Ext.getStore('RequisitionItems').removeAll();
                },
                failure: function(){
                    Ext.Msg.alert("Error", Util.getMessageSyncError());
                }
            });
        } else {
            Ext.Msg.alert("Error", 'Please enter your location and stock location');
        }
            
    },
    
    getCurrentDate: function() {
        var currentTime = new Date();
        var currentDate =  currentTime.getDate() + 1 + "/" + (currentTime.getMonth() + 1) + "/" + currentTime.getFullYear();
        return currentDate;
    },
    
    getCurrentTime: function() {
        var currentTime = new Date();
        var timeOfDay;
        if(currentTime.getHours() > 11) {
            timeOfDay = currentTime.getHours() + ":" + currentTime.getMinutes()+ "PM";
        } else {
            timeOfDay = currentTime.getHours() + ":" + currentTime.getMinutes()+ "AM";    
        }
        return timeOfDay;
    },
    
    // Fills a purchase order when a stock admin wants to make a new issue
    // Populates issue drug fields with drugs + quantites from the purchase order
    //TODO: make sure to only populate issues for the current location
    populateIssueFromPurchaseOrder: function(combo, records){
        Ext.getCmp('issuedispenseLocationPicker').setValue(records[0].data.dispenseLocation.uuid);
        //Ext.getCmp('allStockLocationPicker').setValue(records[0].data.stockLocation.uuid);
        
        // Emptying previous fields
        Ext.getStore('newIssue').removeAll();
        Ext.ComponentQuery.query('goodsIssueGrid')[0].getSelectionModel().deselectAll();
        
        for(var i=0; i<records[0].data.inventories.length; i++){
            // For each inventory, populate the drug name and quantity
            var currDrugUuid = records[0].data.inventories[i].drug.uuid;
            var currDrugName = records[0].data.inventories[i].drug.display;
            var currDrugIndex = Ext.getStore('allDrugs').find('uuid', currDrugUuid);
            
            Ext.getStore('newIssue').add({
                drug: {
                    text: 'currDrugName',
                    uuid: currDrugUuid
                },
                batch: records[0].data.inventories[i].batch,
                quantity: records[0].data.inventories[i].quantity,
                drugName: records[0].data.inventories[i].drug.display,
                uuid: records[0].data.inventories[i].uuid
            })[0];
        }
        // Setting value so that store keeps same filter -- otherwise will stop listening
        Ext.getCmp('issuePurchaseOrderPicker').setValue(records[0]);
    },

    // Adds new row to goods issue grid
    addIssueDrug: function(){
        // Add blank item to store -- will automatically add new row to grid
        Ext.getStore('newIssue').add({
            drugname: '',
            quantity: ''
        })[0];
    },

    // Deletes current row of issue grid
    deleteIssueDrug: function (evtData) {
        var store = this.getStore('newIssue');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            store.remove(record);
        }
    },
        
    // Checks whether the issue is valid -- returns with error message, or null if issue is valid
    validateIssue: function(issues){
        if(issues.items.length === 0){
            return "Please enter a drug";
        }

        Ext.getStore('StockList').clearFilter();
        for (var i=0; i<issues.items.length; i++){
            if (issues.items[i].data.drugName==="" || issues.items[i].data.batch==="" || issues.items[i].data.quantity<0 || issues.items[i].data.expiryDate===""){
                return "Blank fields not allowed";
            }
            if (Ext.getStore('allDrugs').find('text', issues.items[i].data.drugName)===-1){
                return "Drug "+issues.items[i].data.drugName+" not found";
            }
            var batchIndex = Ext.getStore('StockList').find('uuid', issues.items[i].data.batchUuid);
            if (batchIndex===-1){
                return "Batch "+issues.items[i].data.batch+" not found";
            }
            var batch = Ext.getStore('StockList').getAt(batchIndex);
            var qtyLeft = batch.get('quantity');
            if(qtyLeft < issues.items[i].data.quantity){
                return "Quantity cannot exceed batch";
            }
        }
        if( Ext.getCmp('issuedispenseLocationPicker').getValue() === null || Ext.getCmp('issuedispenseLocationPicker').getValue() === undefined) {
            return "Please select a Dispense location";
        }
        return null;
    },
    
    // TODO: Comment
    submitIssue: function(){
        // Validate the submitted issue - respond with Alert message if invalid
        var issues = Ext.getStore('newIssue').data;
        var msg = this.validateIssue(issues);
        if(msg!==null){
            Ext.Msg.alert("Error" , msg);
            return;
        }
        var that = this;

        var drugInventories = [];
        
        RaxaEmr.Pharmacy.model.DrugInventory.getFields()[RaxaEmr_Pharmacy_Controller_Vars.DRUG_INVENTORY_MODEL.BATCH_UUID_INDEX].persist = true;

        // var drugInventoryFields = RaxaEmr.Pharmacy.model.DrugInventory.getFields();
        // var batchUuidField = drugInventoryFields[RaxaEmr_Pharmacy_Controller_Vars.DRUG_INVENTORY_MODEL.BATCH_UUID_INDEX];
        // batchUuidField.persist = true;
        
        var issuedispenseLocationUuid = Ext.getCmp("issuedispenseLocationPicker").value;
        var issueStockLocationUuid = localStorage.location;
        var purchaseOrderUuid = Ext.getCmp('issuePurchaseOrderPicker').getValue();
        var issueStockLocationString = localStorage.locationName;
        var issuedispenseLocationString = Ext.getCmp("issuedispenseLocationPicker").rawValue;
        for (var i = 0; i < issues.items.length; i++) {
            var drugIndex = Ext.getStore('allDrugs').find('text', issues.items[i].data.drugName);
            var expiryDate = new Date(issues.items[i].data.expiryDate + ' GMT-0600');
            drugInventories.push({
                status: RaxaEmr_Pharmacy_Controller_Vars.STOCK_STATUS.SENT,
                batch: issues.items[i].data.batch,
                batchUuid: issues.items[i].data.batchUuid,
                drug: Ext.getStore('allDrugs').getAt(drugIndex).data.uuid,
                quantity: issues.items[i].data.quantity,
                originalQuantity: issues.items[i].data.quantity,
                expiryDate: Util.Datetime(expiryDate),
                location: issuedispenseLocationUuid
            });
            if(purchaseOrderUuid!==null){
                drugInventories[i].uuid = issues.items[i].data.uuid;
            }
        }

        var time = Util.getCurrentTime();
        // model for posting the encounter for given drug orders
        var purchaseOrder = Ext.create('RaxaEmr.Pharmacy.model.PurchaseOrder', {
            name: "Stock Issue",
            description: "Issue from "+issueStockLocationString+" to "+issuedispenseLocationString+ " on " +this.getCurrentDate()+ " at " + this.getCurrentTime(),
            received: "false",
            provider: Util.getLoggedInProviderUuid(),
            stockLocation: issueStockLocationUuid,
            dispenseLocation: issuedispenseLocationUuid,
            drugPurchaseOrderDate: time,
            inventories: drugInventories
        });

        // Create/update Purchase Order via POST call
        Ext.getCmp('submitIssueButton').disable();
        var purchaseOrderStore = Ext.create('RaxaEmr.Pharmacy.store.PurchaseOrders');
        purchaseOrderStore.add(purchaseOrder);
    
        // If we are updating an existing purchase order, set url for that specific P.O.
        if(purchaseOrderUuid!==null){
            purchaseOrderStore.getProxy().url = HOST + '/ws/rest/v1/raxacore/drugpurchaseorder/'+purchaseOrderUuid;
        }

        purchaseOrderStore.sync({
            success: function(){
                // Send alert that requisition has been made
                var alertParams = {
                    name: "Issue from "+issueStockLocationString+" to "+issuedispenseLocationString+ " on " + that.getCurrentDate()+ " at " + that.getCurrentTime(),
                    toLocation: issueStockLocationUuid,
                    fromLocation: issuedispenseLocationUuid,
                    providerSent: Util.getLoggedInProviderUuid(),
                    alertType: "newIssue",
                    defaultTask: "newReceipt",
                    time: Util.getCurrentTime()
                };
                Util.sendAlert(alertParams);

                // Revert URL on Purchase Order store, so it's POSTing new PO rather than updating existing one
                purchaseOrderStore.getProxy().url = HOST + '/ws/rest/v1/raxacore/drugpurchaseorder';
                RaxaEmr.Pharmacy.model.DrugInventory.getFields()[RaxaEmr_Pharmacy_Controller_Vars.DRUG_INVENTORY_MODEL.BATCH_UUID_INDEX].persist = false;
                Ext.getCmp('submitIssueButton').enable();
                Ext.getStore('StockList').load();
                Ext.getCmp('allStockGrid').getView().refresh();
                Ext.getStore('stockIssues');
                Ext.Msg.alert('Successful');
            },
            failure: function() {
                purchaseOrderStore.getProxy().url = HOST + '/ws/rest/v1/raxacore/drugpurchaseorder';
                RaxaEmr.Pharmacy.model.DrugInventory.getFields()[RaxaEmr_Pharmacy_Controller_Vars.DRUG_INVENTORY_MODEL.BATCH_UUID_INDEX].persist = false;
                Ext.getCmp('submitIssueButton').enable();
                Ext.Msg.alert('Error: unable to write to server');
            }
        });

        // TODO: remove? does nothing?
        purchaseOrderStore.on('write', function () {
            }, this);
    },
    
    // TODO: fix. not connected to view, presently.
    // Called in 'RaxaEmr.Pharmacy.view.goodsIssueText'
    cancelIssuePurchaseOrder: function() {
        Ext.getCmp('issuePurchaseOrderPicker').clearValue();
        Ext.getStore('newIssue').removeAll();
        Ext.getStore('newIssue').add({
            drugname: '',
            quantity: ''
        })[0];
    },
    
    // TODO: Refactor all of these filters into a common function. Just pass it an argument to do filtering

    
    filterAllStocksByLocation: function(location) {
        Ext.getStore('StockList').clearFilter();
        //if current location, filter by that
        if(location){
            Ext.getStore('StockList').filter('locationUuid', location);
        }
    },
    
    localStorageStoreLocation: function() {
        localStorage.setItem('stockLocation', Ext.getCmp('stockLocationPicker').getValue());
    },
    
    //Called when 'stock analysis' button is pressed
    showAvailableStock: function(){
        this._updateAllStockPanelButtonsUI('availableStockButton');
        // Ext.getCmp('availableStockButton').setUI('raxa-orange-small');
        Ext.getStore('StockList').clearFilter();
        //if current location, filter by that
        if(localStorage.location){
            Ext.getStore('StockList').filter('locationUuid', localStorage.location);
        }
        Ext.getStore('StockList').filter('status', 'available');
        //        var regExp = /\d+/;
        //        Ext.getStore('StockList').filter('months', regExp);
        Ext.getCmp('allStockGrid').features[0].collapseAll();
    },
    
    //Called when 'Expiring Stock' button is pressed
    showExpiringStock: function(){
        this._updateAllStockPanelButtonsUI('expiringStockButton');
        // Ext.getCmp('expiringStockButton').setUI('raxa-orange-small');
        Ext.getStore('StockList').clearFilter();
        //if current location, filter by that
        if(localStorage.location){
            Ext.getStore('StockList').filter('locationUuid', localStorage.location);
        }
        Ext.getStore('StockList').filterBy(function(record, id){
            return(Util.monthsFromNow(record.data.expiryDate)<RaxaEmr_Pharmacy_Controller_Vars.MONTHS_TO_EXPIRE);
        });
        Ext.getStore('StockList').filter('status', RaxaEmr_Pharmacy_Controller_Vars.STOCK_STATUS.AVAILABLE);
        Ext.getCmp('allStockGrid').features[0].expandAll();
    },
    
    showStockOut: function(){
        this._updateAllStockPanelButtonsUI('lowStockButton');
        // Ext.getCmp('lowStockButton').setUI('raxa-orange-small');
        Ext.getStore('StockList').clearFilter();
        //if current location, filter by that
        if(localStorage.location){
            Ext.getStore('StockList').filter('locationUuid', localStorage.location);
        }
        Ext.getStore('StockList').filterBy(function(record, id){
            return(record.data.quantity<RaxaEmr_Pharmacy_Controller_Vars.STOCK_OUT_LIMIT);
        });
        Ext.getStore('StockList').filter('status', RaxaEmr_Pharmacy_Controller_Vars.STOCK_STATUS.AVAILABLE);
        Ext.getCmp('allStockGrid').features[0].expandAll();
    },
    
    showAllOrders: function(){
        this._updateAllStockPanelButtonsUI('allOrdersButton');
        // Ext.getCmp('allOrdersButton').setUI('raxa-orange-small');
        Ext.getStore('StockList').clearFilter();
    },
    
    _updateAllStockPanelButtonsUI: function(id){
        var btns = ['availableStockButton', 'expiringStockButton', 'lowStockButton', 'allOrdersButton'];
        for (var i=0; i < btns.length; i++) {

            Ext.getCmp(btns[i]).toggle(false);
        }
        var cmp = Ext.getCmp(id);
        if (cmp) { 
            cmp.toggle(true)
        };
    },
    
    // Reduces the batch quantity in back end
    decrementBatchForPrescription: function() {
        // If there is a batch, for each drug decrement
        var drugInventories = [];
        //var issues = Ext.getStore('newIssue').data;
        var drugs = Ext.getStore('orderStore').data;
        RaxaEmr.Pharmacy.model.DrugInventory.getFields()[RaxaEmr_Pharmacy_Controller_Vars.DRUG_INVENTORY_MODEL.BATCH_UUID_INDEX].persist = true;
        var prescriptionStockLocationString = Ext.getStore("Locations").find('uuid', localStorage.stockLocation);
        var prescriptionStockLocationUuid = localStorage.stockLocation;
        
        // Create drug inventories
        for (var i = 0; i < drugs.items.length; i++) {
            if(drugs.items[i].data.batchUuid!==null && drugs.items[i].data.batch!==null && drugs.items[i].data.batchUuid!==""){
                //getting index of drug in store
                var drugIndex = Ext.getStore('allDrugs').find('text', drugs.items[i].data.drugName);
                drugInventories.push({
                    status: RaxaEmr_Pharmacy_Controller_Vars.STOCK_STATUS.PRESCRIBED,
                    batch: drugs.items[i].data.batch,
                    batchUuid: drugs.items[i].data.batchUuid,
                    drug: Ext.getStore('allDrugs').getAt(drugIndex).data.uuid,
                    quantity: drugs.items[i].data.qty
                });
            }
        }

        var time = Util.getCurrentTime();
        // Model for posting the encounter for given drug orders
        var purchaseOrder = Ext.create('RaxaEmr.Pharmacy.model.PurchaseOrder', {
            // Keep the name here -- back end depends on it.
            // TODO: Would like to eventually see purchase order types
            // https://raxaemr.atlassian.net/browse/RAXAJSS-411
            name: "Prescription",
            description: "Prescription from "+prescriptionStockLocationString+ " on "+time.toString().substr(0, 10),
            received: "true",
            provider: Util.getLoggedInProviderUuid(),
            stockLocation: prescriptionStockLocationUuid,
            dispenseLocation: localStorage.location,
            drugPurchaseOrderDate: time,
            inventories: drugInventories
        });
        
        // Make post call for encounter -- if we are updating a purchase order, set url, otherwise post
        var purchaseOrderStore = Ext.create('RaxaEmr.Pharmacy.store.PurchaseOrders');
        purchaseOrderStore.add(purchaseOrder);

        // TODO: Should we be updating the URL here? as done in submitIssue
        // If we are updating an existing purchase order, set url for that specific P.O.
        // if(purchaseOrderUuid!==null){
        //     purchaseOrderStore.getProxy().url = HOST + '/ws/rest/v1/raxacore/drugpurchaseorder/'+purchaseOrderUuid;
        // }

        purchaseOrderStore.sync({
            success: function(){
                RaxaEmr.Pharmacy.model.DrugInventory.getFields()[RaxaEmr_Pharmacy_Controller_Vars.DRUG_INVENTORY_MODEL.BATCH_UUID_INDEX].persist = false;
                Ext.getStore('StockList').load();
                Ext.getCmp('allStockGrid').getView().refresh();
                Ext.getStore('batches').load();
            },
            failure: function(){
                Ext.Msg.alert("Error", Util.getMessageSyncError());
            }
        });
    },
    
    sendPrescriptionFill: function() {
        var time = Util.getCurrentTime();
        // Set persist false for orders (we have already sent them as a prescription encounter, dont want to send again)
        // https://raxaemr.atlassian.net/browse/RAXAJSS-411
        // TODO: make this index not a magic number
        RaxaEmr.Pharmacy.model.drugEncounter.getFields()[5].persist = false;

        var encounter = Ext.create('RaxaEmr.Pharmacy.model.drugEncounter', {
            patient: localStorage.person,
            // this is the encounter for the prescription encounterType
            encounterType: localStorage.prescriptionfillUuidencountertype,
            encounterDatetime: time,
            provider: localStorage.loggedInUser
        });

        var encounterStore = Ext.create('RaxaEmr.Pharmacy.store.drugEncounter');
        encounterStore.add(encounter);
        //decrement batch for prescription
        this.decrementBatchForPrescription();
        // make post call for encounter
        encounterStore.sync({
            failure: function(){
                Ext.Msg.alert("Error", Util.getMessageSyncError());
            }
        });
        //https://raxaemr.atlassian.net/browse/RAXAJSS-411
        //TODO: make this index not a magic number
        RaxaEmr.Pharmacy.model.drugEncounter.getFields()[5].persist = true;
    },
    
    prescriptionFillPatient: function(){
        // Checking to see if the item is '1' which means that new patient panel is active
        // So we are adding a new patient, and we want to save the patient
        if(Ext.getCmp('addpatientarea').items.indexOf(Ext.getCmp('addpatientarea').getLayout().activeItem)===1) {
            this.savePerson();
        }
        else{
            this.sendPharmacyEncounter(localStorage.person,localStorage.prescriptionUuidencountertype);
        }
    },
    
    deleteAlert: function(evtData) {
        var store = this.getStore('Alerts');
        var record = store.getAt(evtData.rowIndex);
        if(record) {
            store.remove(record);
            var seenAlert = {
                seen: "true"
            };
            Ext.Ajax.request({
                url: HOST + '/ws/rest/v1/raxacore/raxaalert/'+record.data.uuid,
                method: 'POST',
                params: Ext.encode(seenAlert),
                disableCaching: false,
                headers: Util.getBasicAuthHeaders(),
                success: function (response) {
                    console.log('Alert marked as seen');
                },
                failure: function() {
                    Ext.Msg.alert("Error", Util.getMessageSyncError());
                }
            });
        }
    },
    
    // Hides inventory editor
    cancelEditInventory: function () {
        Ext.getCmp('inventoryEditor').hide();
    },
    
    // Hides new patient details 
    cancelNewPatient: function () {
        Ext.getCmp('newPatient').hide();
    },
    
    
    // Updates inventory according to Inventory Editor fields
    updateInventory: function() {
        var inventory = {
            status: Ext.getCmp('inventoryEditorStatusPicker').getValue(),
            quantity: Ext.getCmp('inventoryEditorQuantity').getValue(),
            drug: Ext.getCmp('inventoryEditorDrugPicker').getValue()
        };
        if(Ext.getCmp('inventoryEditorLocationPicker').getValue()!==""){
            inventory.location=Ext.getCmp('inventoryEditorLocationPicker').getValue();
        }
        if(Ext.getCmp('inventoryEditorBatch').getValue()!==""){
            inventory.batch=Ext.getCmp('inventoryEditorBatch').getValue();
        }
        if(Ext.getCmp('inventoryEditorExpiryDate').getValue()!==""){
            inventory.expiryDate=Ext.getCmp('inventoryEditorExpiryDate').getValue();
        }
        if(Ext.getCmp('inventoryEditorRoomLocation').getValue()!==""){
            inventory.roomLocation=Ext.getCmp('inventoryEditorRoomLocation').getValue();
        }
        if(Ext.getCmp('inventoryEditorSupplier').getValue()!==""){
            inventory.supplier=Ext.getCmp('inventoryEditorSupplier').getValue();
        }
        Ext.getCmp('updateInventoryButton').disable();

        // This call is made with an Ajax call, rather than a traditional model+store because the fields to be sent
        // Are much different than the normal drug inventory fields.
        Ext.Ajax.request({
            url: HOST + '/ws/rest/v1/raxacore/druginventory/'+localStorage.getItem('currentInventory'),
            method: 'POST',
            params: Ext.encode(inventory),
            disableCaching: false,
            headers: Util.getBasicAuthHeaders(),
            success: function (response) {
                Ext.getCmp('inventoryEditor').hide();
                Ext.getCmp('updateInventoryButton').enable();
                Ext.Msg.alert("Edit Successful");
                Ext.getStore('StockList').load();
                Ext.getCmp('allStockGrid').getView().refresh();
                Ext.getStore('batches').load();
            },
            failure: function (){
                Ext.getCmp('updateInventoryButton').enable();
                Ext.Msg.alert("Error: unable to write to server");
            }
        });
    },
    
    filterDrugs: function(comboBox) {
        Ext.getCmp(comboBox).getStore().filterBy(function(record){
            if(record.data.display.toLowerCase().indexOf(Ext.getCmp(comboBox).getValue().toLowerCase())!==-1){
                return true;
            }
            return false;
        });
    },
    
    currentDatePrescription: function() {
        var orderStore = Ext.getStore('orderStore');
        if(orderStore.data.items[0] !== undefined)
        var filterStartDate = orderStore.data.items[0].data.date;
        orderStore.filter(function(r) {
            var value = r.get('date');
            return (value === filterStartDate);
        });
    },
    
    historyPatientPrescription: function() {
        var drugOrderStore = Ext.getStore('orderStore');
        drugOrderStore.clearFilter(true);
        var presDrug = Ext.getCmp('prescribedDrugs')
        presDrug.getView().refresh()
    }
});




