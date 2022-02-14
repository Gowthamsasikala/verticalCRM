const mongoose = require('mongoose');


const customerSchema = mongoose.Schema({
    _id : mongoose.Schema.Types.ObjectId,
    company_name:{
        type : String
    },
    display_name : {
        type : String
    },
    email:{
        type : String
    },
    first_name :{
        type : String
    },
    last_name : {
        type : String
    },
    custom_fields : [
        {
            label : { type : String },
            value : { type : String }
        }
    ],
    subscription_id: { type : String}
})

module.exports = mongoose.model('customerInfos',customerSchema)