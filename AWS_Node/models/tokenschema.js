const mongoose = require('mongoose');


const tokenSchemas = mongoose.Schema({
    access_token : {
        type : String
    },
    refresh_token : {
        type : String
    }
})

 module.exports = {
     member : mongoose.model('Token',tokenSchemas)
 } 