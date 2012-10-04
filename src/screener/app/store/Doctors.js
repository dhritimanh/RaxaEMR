/**
 * This store loads the doctors from file 'doctors.json'
 * Note: there is no writer attached, so changes will
 * only occur in local cache
 */

Ext.define('Screener.store.Doctors', {
    requires: ['Screener.model.Doctor'],
    extend: 'Ext.data.Store',
    storeId: 'doctorStore',
    config: {
        model: 'Screener.model.Doctor',
        proxy: {
            type: 'ajax',
            url: HOST +'/ws/rest/v1/provider?v=full',
            headers: Util.getBasicAuthHeaders(),
            reader: {
                type: 'json',
                rootProperty: 'results'
            }
        },
        autoLoad: true,
        listeners:{
            'load': function() {
                this.filterBy(function(record){
                    console.log(record);
                    if(record.data.attributes.length > 0){
                        return record.data.attributes[0].display === Util.DOCTOR_ATTRIBUTE;
                    }
                    return false;
                });
            
            }
        }
    }
}); 



/*
Ext.define('Screener.store.Doctors', {
    extend: 'Ext.data.Store',
    //xtype: 'doctorStore',
    config: {
        model: 'Screener.model.Doctor',
        proxy: {
            type: 'ajax',
            url: 'data/doctors.json',
            reader: 'json'
        },
        autoLoad: true
    }
});

*/
