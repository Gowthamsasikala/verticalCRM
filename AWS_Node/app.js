'use strict';
const express = require('express');
const app = express();
var catalyst = require('zcatalyst-sdk-node');
const axios = require('axios');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
var cors = require('cors');
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.json());
const dns = require('dns');
// const data1 = require('./response.json');
// import https from 'https'
const https = require('https');

//Schema
const accessTokens = require('./models/tokenschema');
const customerSchema = require('./models/customerInfoSchema');


// import config file from json
const config = require('./config.json');

// connecting to mongoDB
// mongoose.connect('mongodb://localhost:27017/verticalcrm');
mongoose.connect('mongodb+srv://gowtham123:gowtham123@verticalcrm.tmmdd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority');

mongoose.connection.on('connected', () => {
  console.log("mongodb connected successfully..!")
})

mongoose.connection.on('error', (err) => {
  if (err) {
    console.log("mongodb has an error ----> " + err);
  }
})



dns.resolve("gowtham.zohoplatform.com", 'ANY', (err, records) => {
  if (err) {
    console.log("Error in dns: ", err);
  } else {
    console.log(records,'No Prob');
  }
});
app.listen(3000, function () {
   console.log("server is running on port 3000");
 })
 
 app.get("/check", function (req, res) {
   var app = catalyst.initialize(req);
   res.send({message : 'Sucess',
   data : app});
 });

 app.use(function (req, res, next) {
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
   res.setHeader('Access-Control-Allow-Credentials', true);
   next();
 });
 
 app.get('/getCustomerInfoData', async function (req, res) {
   try {
     let customerData = await customerSchema.find({});
     res.send(customerData);
   } catch (error) {
     res.send(error);
   }
 })
 
 app.post('/saveCustomerInfoData', async function (req, res) {
   if (req.body) {
     console.log('gowthamae');
     const customerDataLength = await customerSchema.find({});
     if (customerDataLength.length == 0) {
       const data = new customerSchema({
         _id: new mongoose.Types.ObjectId(),
         company_name: req.body.company_name,
         display_name: req.body.display_name,
         email: req.body.email,
         first_name: req.body.first_name,
         last_name: req.body.last_name,
         custom_fields: req.body.custom_fields
       });
       data.save().then(result => {
         res.send(result);
       }).catch(err => {
         console.log(err);
       })
     } else if (customerDataLength.length == 1) {
       let val = {
         company_name: req.body.company_name,
         display_name: req.body.display_name,
         email: req.body.email,
         first_name: req.body.first_name,
         last_name: req.body.last_name,
         custom_fields: req.body.custom_fields
       }
       try {
         let update = await customerSchema.findOneAndUpdate({ '_id': customerDataLength[0]['_id'] }, val);
         res.send(update);
       } catch (error) {
 
       }
     }
 
   }
 });


 async function callPlatformCancelAPI(data, zgid, planId) {
   const url = config['plaftformURL'] + zgid + '/plan/' + planId + config['zapiKey'];
   const headers = {
     'Content-Type': 'application/json'
   }
 
   try {
     const cancel = await axios.delete(url, { headers, data });
     console.log(JSON.parse(cancel.data['Message'])['result']);
     if (JSON.parse(cancel.data['Message'])['result'] == 'Success') {
       return cancel.data;
     } else if (JSON.parse(cancel.data['Message'])['result'] == 'Error') {
       return cancel.data;
     }
   } catch (error) {
     console.log(error);
     return error['data'];
   }
 }
 
 //Change Plan to high grade
 app.post('/changePlan', async function (req, res) {
   var request = req.body;
 
   const retrieveTokenVal = await retrieveToken();
   if (retrieveTokenVal.length == 0) { } else if (retrieveTokenVal.length == 1) { // having access token in db
     try {
       const updateVal = await updateSubscriptionToHigherPlan(request, retrieveTokenVal[0]['access_token']);
       console.log(updateVal);
       if (updateVal['data']['message'] == 'Hosted page has been created successfully.') {
         // let response = await updatePlatformSubscription(updateVal['data']);
 
         // let data = {
         //   subscriptionVal : updateVal['data'],
         //   plaformRes : response
         // }
         res.send(updateVal['data']);
       }
     } catch (err) {
       console.log("access token expired..! soo error..!");
       if (retrieveTokenVal.length > 0 && retrieveTokenVal[0]['refresh_token'].length > 0) {
         const getaccessToken = await generateAccessToken(retrieveTokenVal[0]['refresh_token']);
         console.log(getaccessToken, 'getaccessToken');
         const updateSubscriptionDataById = await updateSubscriptionToHigherPlan(request, subId, getaccessToken);
         let val = await accessTokens.member.findOneAndUpdate({ '_id': retrieveTokenVal[0]['_id'] }, { 'access_token': getaccessToken, 'refresh_token': retrieveTokenVal[0]['refresh_token'] })
         console.log(val);
         if (updateSubscriptionDataById['data']['message'] === 'Hosted page has been created successfully.') {
           //  let response = await updatePlatformSubscription(updateSubscriptionDataById['data']);
 
           //  let data = {
           //    subscriptionVal : updateSubscriptionDataById['data'],
           //    plaformRes : response
           //  }
           res.send(updateSubscriptionDataById['data']);
         }
 
       }
     }
   }
 })
 
 
 //cancel Subscription
 app.post('/cancelSubscription', async function (req, res) {
   console.log(req.body);
   const data = {
     "ZUID": req.body.ZUID.toString(),
     "SUBSCRIPTION_ID": req.body.SUBSCRIPTION_ID.toString()
   }
   // call another cancel subscription api call
   const retrieveTokenVal = await retrieveToken();
   console.log(retrieveTokenVal, 'get tokens');
   if (retrieveTokenVal.length == 0) { }
   else if (retrieveTokenVal.length == 1) {
     try {
       const assessTokens = retrieveTokenVal[0]['access_token'];
       const cancelApi = await cancelSubscriptionApi(assessTokens, req.body.SUBSCRIPTION_ID);
       console.log(cancelApi);
       console.log(cancelApi['data']);
       if (cancelApi['data']['message'] == 'Your subscription has been canceled.') {
         console.log('inside if');
         let cancel = await callPlatformCancelAPI(data, req.body.ZGID, req.body.PLAN_ID);
         console.log(cancel);
         res.send(cancel);
       } else if (cancelApi['data']['message'] == 'Subscription is in inactive state.') {
         res.send({ Message: 'Subscription is in inactive state.' });
       }
     } catch (err) {
       if (retrieveTokenVal.length > 0 && retrieveTokenVal[0]['refresh_token'].length > 0) {
         const getaccessToken = await generateAccessToken(retrieveTokenVal[0]['refresh_token']);
         console.log(getaccessToken, 'getaccessToken');
         try {
           const cancelApi = await cancelSubscriptionApi(getaccessToken, req.body.SUBSCRIPTION_ID);
           console.log("gowtham", cancelApi);
           if (cancelApi['data']['message'] == 'Your subscription has been canceled.') {
             let cancel = await callPlatformCancelAPI(data, req.body.ZGID, req.body.PLAN_ID);
             console.log(cancel);
             res.send(cancel['data']);
           } else if (cancelApi['data']['message'] == 'Subscription is in inactive state.') {
             res.send({ Message: 'Subscription is in inactive state.' });
           }
         } catch (error) {
           console.log('hemamalini', error['response']['data']);
           res.send(error['response']['data']);
         }
         let val = await accessTokens.member.findOneAndUpdate({ '_id': retrieveTokenVal[0]['_id'] }, { 'access_token': getaccessToken, 'refresh_token': retrieveTokenVal[0]['refresh_token'] })
 
       }
     }
   }
 })
 
 //create subscription
 app.post("/addSubscription", async function (req, res) {
   const obj = new Object();
   //customer info should be saved in to db.
   const data1 = req.body;
   let cusData = await customerSchema.find({});
   console.log(cusData,'customerData');
   console.log(req.body,'req data');
   const custom_fields = cusData[0]['custom_fields'];
   var zgid = '';
   for (var i = 0; i < custom_fields.length; i++) {
     if (custom_fields[i]['label'] == 'zuid') {
       obj['ZUID'] = custom_fields[i]['value'];
     }
     if (custom_fields[i]['label'] == 'zgid') {
       zgid = custom_fields[i]['value'];
     }
   }
 
   var no_of_users = 0;
   // const planId = data1['data']['subscription']['plan']['plan_code'];
   // if (planId.includes('_Y') == true) {
   //   obj['FREQUENCY'] = '4';
   // } else {
   //   obj['FREQUENCY'] = '1';
   // }
   obj['FREQUENCY'] = '1';
   obj['SUBSCRIPTION_ID'] = data1['data']['subscription']['subscription_id'];
   obj['STORAGE_UNITS'] = '1';
   const addOn = data1['data']['subscription']['addons'];
   var profileData = {};
   for (var i = 0; i < addOn.length; i++) {
     no_of_users += addOn[i]['quantity'];
     profileData[addOn[i]['addon_code']] = addOn[i]['quantity'].toString();
   }
   obj['NO_OF_USERS'] = no_of_users.toString();
   obj['CUSTOM_PRICING_JSON'] = profileData;
   console.log(obj);
   const planCodeId = data1['data']['subscription']['plan']['plan_code'];
   const url = config['plaftformURL'] + zgid + '/plan/' + planCodeId + config['zapiKey'];
   console.log(url);
   try {
     const addSubscriptionVal = await axios.post(url, obj);
     console.log(addSubscriptionVal['data'],'gowtham');
     return res.send(addSubscriptionVal['data']);
   } catch (err) {
     console.log('error', err);
   }
 
 
 });
 
 //update subscription
 app.post('/updateSubscription/:subId', async function (req, res) {
   console.log(req.body);
   var request = req.body;
   var subId = req.params.subId;
   const retrieveTokenVal = await retrieveToken();
   if (retrieveTokenVal.length == 0) { } else if (retrieveTokenVal.length == 1) { // having access token in db
     try {
       const updateVal = await updateSubscriptionById(request, subId, retrieveTokenVal[0]['access_token']);
       console.log(updateVal);
       if (updateVal['data']['message'] == 'Subscription has been updated successfully.') {
         let response = await updatePlatformSubscription(updateVal['data']);
 
         let data = {
           subscriptionVal: updateVal['data'],
           plaformRes: response
         }
         res.send(data);
       }
     } catch (err) {
       console.log("access token expired..! soo error..!");
       if (retrieveTokenVal.length > 0 && retrieveTokenVal[0]['refresh_token'].length > 0) {
         const getaccessToken = await generateAccessToken(retrieveTokenVal[0]['refresh_token']);
         console.log(getaccessToken, 'getaccessToken');
         const updateSubscriptionDataById = await updateSubscriptionById(request, subId, getaccessToken);
         let val = await accessTokens.member.findOneAndUpdate({ '_id': retrieveTokenVal[0]['_id'] }, { 'access_token': getaccessToken, 'refresh_token': retrieveTokenVal[0]['refresh_token'] })
         console.log(val);
         if (updateSubscriptionDataById['data']['message'] === 'Subscription has been updated successfully.') {
           let response = await updatePlatformSubscription(updateSubscriptionDataById['data']);
 
           let data = {
             subscriptionVal: updateSubscriptionDataById['data'],
             plaformRes: response
           }
           res.send(data);
         }
       }
     }
   }
 
 })


 
app.post('/updatePlaform', async function (req, res) {
   let data = req.body['data'];
   console.log(req.body,'request body gowtham');
   let customerData = await customerSchema.find({});
   let ZUID_val = '', ZGID_val = '';
   for (var i = 0; i < customerData[0]['custom_fields'].length; i++) {
     if (customerData[0]['custom_fields'][i]['label'] == 'zuid') {
       ZUID_val = customerData[0]['custom_fields'][i]['value'];
     }
     if (customerData[0]['custom_fields'][i]['label'] == 'zgid') {
       ZGID_val = customerData[0]['custom_fields'][i]['value'];
     }
   }
   console.log(data, 'dataaaa');
   let obj = {
     ZUID: ZUID_val,
     NO_OF_USERS: data['subscription']['plan']['quantity'],
     //FREQUENCY : data['subscription']['plan']['plan_code'].includes('_Y') ? '4' : '1',
     FREQUENCY: '1',
     SUBSCRIPTION_ID: data['subscription']['subscription_id'],
     STORAGE_UNITS: '1',
     //need to implement the logic for ADDON_ZOHO_PROJECTS
     // ADDON_ZOHO_BOOKS
     // ADDON_ZOHO_EXPENSE
     // ADDON_ZOHO_INVENTORY
     // ADDON_ZOHO_SUBSCRIPTIONS
     // ADDON_ZOHO_SURVEY
     // ADDON_ZOHO_FORMS
     // ADDON_ZOHO_REPORTS
     // ADDON_ZOHO_DESK
     // ADDON_ZOHO_SIGN
   }
 
   const planCode = data['subscription']['plan']['plan_code'];
   console.log(planCode, 'plancode');
   
   const URL = config['plaftformURL'] + ZGID_val + '/plan/' + planCode + config['zapiKey'];
 
   let modifySub = await axios.put(URL, obj,{
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });
   console.log(modifySub, 'modify');
   return modifySub['data'];
 })
 
 async function updatePlatformSubscription(data) {
   let customerData = await customerSchema.find({});
   let ZUID_val = '', ZGID_val = '';
   for (var i = 0; i < customerData[0]['custom_fields'].length; i++) {
     if (customerData[0]['custom_fields'][i]['label'] == 'zuid') {
       ZUID_val = customerData[0]['custom_fields'][i]['value'];
     }
     if (customerData[0]['custom_fields'][i]['label'] == 'zgid') {
       ZGID_val = customerData[0]['custom_fields'][i]['value'];
     }
   }
   console.log(data, 'dataaaa');
   let obj = {
     ZUID: ZUID_val,
     NO_OF_USERS: data['subscription']['plan']['quantity'],
     //  FREQUENCY : data['subscription']['plan']['plan_code'].includes('_Y') ? '4' : '1',
     FREQUENCY: '1',
     SUBSCRIPTION_ID: data['subscription']['subscription_id'],
     STORAGE_UNITS: '1',
     //need to implement the logic for ADDON_ZOHO_PROJECTS
     //      ADDON_ZOHO_BOOKS
     // ADDON_ZOHO_EXPENSE
     // ADDON_ZOHO_INVENTORY
     // ADDON_ZOHO_SUBSCRIPTIONS
     // ADDON_ZOHO_SURVEY
     // ADDON_ZOHO_FORMS
     // ADDON_ZOHO_REPORTS
     // ADDON_ZOHO_DESK
     // ADDON_ZOHO_SIGN
   }
 
   const planCode = data['subscription']['plan']['plan_code'];
   console.log(planCode, 'plancode');
   
   const URL = config['plaftformURL'] + ZGID_val + '/plan/' + planCode + config['zapiKey'];
  //  timeout: 1000 * 5
   let modifySub = await axios.put(URL, obj,{
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });
   console.log(modifySub, 'modify');
  //  res.send(modifySub['data']);
  return modifySub['data'];
 
 }
 
 async function updateSubscriptionById(req, subId, accessToken) {
   const header = {
     'Authorization': 'Zoho-oauthtoken ' + accessToken,
     'Content-Type': 'application/json',
     'X-com-zoho-subscriptions-organizationid': '769842368'
   }
   const data = await axios.put(config['subscriptionBaseUrl'] + subId, req, { headers: header })
   return data;
 }
 
 async function updateSubscriptionToHigherPlan(req, accessToken) {
   const header = {
     'Authorization': 'Zoho-oauthtoken ' + accessToken,
     'Content-Type': 'application/json',
     'X-com-zoho-subscriptions-organizationid': '769842368'
   }
   const data = await axios.post(config['hostedPageUrl'] + 'updatesubscription', req, { headers: header })
   return data;
 }


 
app.get('/getCode', (req, res) => {
   console.log(req.query.code);
   generateAccessAndRefreshToken(req.query.code).then(data => {
     console.log(data);
   });
   return res.send(req.query.code);
 });
 // get subscriptionData using ID
 app.get('/getSubscriptionByID/:id', async (req, res) => {
   var subId = req.params.id;
   const retrieveTokenVal = await retrieveToken();
   if (retrieveTokenVal.length == 0) {
 
   } else if (retrieveTokenVal.length == 1) { // having access token in db
     try {
       const getSubscriptionData = await getSubscriptionByIDs(subId, retrieveTokenVal[0]['access_token']);
       res.send(getSubscriptionData["data"])
     } catch (err) {
       console.log("access token expired..! soo error..!");
       if (retrieveTokenVal.length > 0 && retrieveTokenVal[0]['refresh_token'].length > 0) {
         const getaccessToken = await generateAccessToken(retrieveTokenVal[0]['refresh_token']);
         const getSubscriptionData = await getSubscriptionByIDs(subId, getaccessToken);
         let val = await accessTokens.member.findOneAndUpdate({ '_id': retrieveTokenVal[0]['_id'] }, { 'access_token': getaccessToken, 'refresh_token': retrieveTokenVal[0]['refresh_token'] })
         res.send(getSubscriptionData['data']);
       }
     }
   }
 });
 
 async function cancelSubscriptionApi(assessTokens, SUBSCRIPTION_ID) {
   const header = {
     'Authorization': 'Zoho-oauthtoken ' + assessTokens,
     'Content-Type': 'application/json',
     'X-com-zoho-subscriptions-organizationid': '769842368'
   }
   const cancelApi = await axios.post(config['subscriptionBaseUrl'] + SUBSCRIPTION_ID + '/cancel', {}, { headers: header });
   console.log('try..');
   return cancelApi;
 }
 
 async function retrieveToken() {
   const val = await accessTokens.member.find({});
   return val;
 }
 
 async function getSubscriptionByIDs(subId, accessToken) {
   const header = {
     'Authorization': 'Zoho-oauthtoken ' + accessToken,
     'Content-Type': 'application/json',
     'X-com-zoho-subscriptions-organizationid': '769842368'
   }
   const data = await axios.get(config['subscriptionBaseUrl'] + subId, { headers: header })
 
   return data;
 }


 
// generate grant token
function generateGrantTokenCode() { }

// generate access token and refresh token
async function generateAccessAndRefreshToken(_grantToken) {

  const url = config['tokenBaseURL'] + 'scope=' + config['scope'] + '&client_id=' + config['client_id'] + '&redirect_uri=http://localhost:3000/getCode' + '&code=' + _grantToken + '&client_secret=' + config['client_secret'] + '&grant_type=' + config['grant_type'];
  const data = await axios.post(url, {});
  console.log(data['access_token'], 'access token');
  console.log(data['refresh_token'], 'refresh token');
  return data['access_token'];
}

// generate access token using refresh token
async function generateAccessToken(refereshToken) {
  // const refereshToken = '1000.c8ab8af8af748da7c653339c9595a27c.d94d95bbab8b3c6107811472c29d3463';
  var accessToken = '';
  const url = config['tokenBaseURL'] + 'refresh_token=' + refereshToken + '&client_id=' + config['client_id'] + '&client_secret=' + config['client_secret'] + '&redirect_uri=' + config['redirect_uri'] + '&grant_type=refresh_token';
  const data = await axios.post(url, {});
  return data['data']['access_token'];
}

//get plans by product id's
app.get('/getPlansbyProdId/:productId', async function (req, res) {
  const productId = req.params.productId;
  console.log(productId, 'produ id');
  const retrieveTokenVal = await retrieveToken();
  console.log(retrieveTokenVal, 'edhuva');
  if (retrieveTokenVal.length == 0) { } else if (retrieveTokenVal.length == 1) { // having access token in db
    try {
      const planData = await getplansByProductId(productId, retrieveTokenVal[0]['access_token']);
      console.log(planData);
      res.send(planData['data']);
    } catch (err) {
      console.log("access token expired..! soo error..!");
      if (retrieveTokenVal.length > 0 && retrieveTokenVal[0]['refresh_token'].length > 0) {
        const getaccessToken = await generateAccessToken(retrieveTokenVal[0]['refresh_token']);
        console.log(getaccessToken, 'getaccessToken');
        const getPlanArrData = await getplansByProductId(productId, getaccessToken);
        let val = await accessTokens.member.findOneAndUpdate({ '_id': retrieveTokenVal[0]['_id'] }, { 'access_token': getaccessToken, 'refresh_token': retrieveTokenVal[0]['refresh_token'] })
        console.log(val);
        res.send(getPlanArrData['data']);
      }
    }
  }

})


//get all addons
app.get('/getAddOns/:prodId', async function (req, res) {
   let productId = req.params.prodId;
   const retrieveTokenVal = await retrieveToken();
   //  console.log(retrieveTokenVal, 'edhuva');
   if (retrieveTokenVal.length == 0) { } else if (retrieveTokenVal.length == 1) { // having access token in db
     try {
       const addOnData = await getAddOnByProdId(productId, retrieveTokenVal[0]['access_token']);
       // console.log(addOnData);
       res.send(addOnData['data']);
     } catch (err) {
       console.log("access token expired..! soo error..!");
       if (retrieveTokenVal.length > 0 && retrieveTokenVal[0]['refresh_token'].length > 0) {
         const getaccessToken = await generateAccessToken(retrieveTokenVal[0]['refresh_token']);
         //    console.log(getaccessToken, 'getaccessToken');
         const getaddOnArrData = await getAddOnByProdId(productId, getaccessToken);
         let val = await accessTokens.member.findOneAndUpdate({ '_id': retrieveTokenVal[0]['_id'] }, { 'access_token': getaccessToken, 'refresh_token': retrieveTokenVal[0]['refresh_token'] })
         console.log(getaddOnArrData);
         res.send(getaddOnArrData['data']);
       }
     }
   }
 })
 
 async function getAddOnByProdId(prodId, accessToken) {
   try {
     const url = config['BaseUrl'] + 'addons?filter_by=AddonStatus.ACTIVE&product_id=' + prodId;
     const headers = {
       'X-com-zoho-subscriptions-organizationid': '769842368',
       'Content-Type': 'application/json',
       'Authorization': 'Zoho-oauthtoken ' + accessToken
     }
     const addOnArr = await axios.get(url, { headers: headers });
     console.log(addOnArr);
     return addOnArr;
   } catch (err) {
     console.log(err, 'err');
   }
 }
 
 async function getplansByProductId(productId, accessToken) {
   try {
     const url = config['BaseUrl'] + 'plans?filter_by=PlanStatus.ACTIVE&product_id=' + productId;
     const headers = {
       'X-com-zoho-subscriptions-organizationid': '769842368',
       'Content-Type': 'application/json',
       'Authorization': 'Zoho-oauthtoken ' + accessToken
     }
     const planArr = await axios.get(url, { headers: headers });
     return planArr;
   } catch (err) {
     console.log(err, 'err');
   }
 
 }

app.get('/',(req,res)=>{
	var app = catalyst.initialize(req); 

   res.send(app);
});

app.get('/abc',(req,res)=>{
	
   res.send("hi abc");
});

module.exports= app;
