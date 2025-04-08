const Axios = require("axios");
const HTTP  = require("http");
const PreferedPort =3000;

//THIS SHOULD BE A MIRROR IMAGE OF THE MONGO_DATABASE BUT LOCAL.
//Every time the DATABASE gets Updated This local database is also updates, this is a faster way transforming info:
const LOCAL_USERS_DATABASE={

  "CUSTOMER":{
      /*SAMPLE Component:

   "USER_ID":{
     "Phone":"+20102812313",
     "PIN": "123133",
     "LOCATION":[10231,21313] //Longtiude,Latitude
   }

  */
  },
  "RIDER":{

  },
  "RESTAURANT":{

  }

}
//{}
function UpdateDatabase(databaseType,userComponent,args={global:false}){
//userComponent should take the form: {userID:1231212213, }
//databaseType: can be either 'customer','rider','restaurant'; 
//IF args.global== TRUE, THEN update mongoDB Database as well. This is a good option for example to only update the mongodb with one request at the end of all data saving.
//IF args.target=="all", THEN the whole user object in the LOCAL DATABASE gets updated and uploaded to MongoDB. IF args.targetData="current". THEN ONLY current passed data gets updated and uploaded to MongoDB.
 /******************************* UPDATE LOCAL DATABSE *******************************/
  const _databaseInTarget= LOCAL_USERS_DATABASE[databaseType];

 //Validate that databse actually exists:
 if(!_databaseInTarget){console.log(`[DATABASE ERROR]: databaseType Received Doesn't exsit, IT can be one of 3: "CUSTOMER", "RIDER", "RESTAURANT"`);return undefined}
 //Validate if userID exists within userComponent:
 if(!userComponent?.userID){console.log(`[DATABASE ERROR]: userComponent Passed Must have a userID attribute, None Received.`); return undefined}
 
  //Validate if USER Component exists in the databse or not. IF NOT, THEN CREATE ONE.
  if(!_databaseInTarget[userComponent?.userID]){
    _databaseInTarget[userComponent?.userID]={
    //Generate A Customer ID:
      cust_id:`CUST-${userComponent.userID}`
    }
  };
  const _userID=userComponent?.userID;
    switch(databaseType){
      case "CUSTOMER":
      //Delete the userID attribute:
        delete userComponent[_userID];
        //Update the required Data:
        Object.entries(userComponent).map(([_attributeKey,_attributeValue])=>{
          _databaseInTarget[_userID][_attributeKey]=_attributeValue;
        })
         break;
      case "RIDER":
         break;
      case "RESTAURANT":
        break;
 }

 return true;
/******************************* UPDATE GLOBAL DATABSE *******************************/

}
function _validatePhoneNumber(_phoneNumber,_criteria={pattern:/\+91\d{10}$/}){
 //Match the pattern first, IF EXISTS:
  if(_criteria.pattern&&_phoneNumber) return (_phoneNumber.replaceAll(/\s+/g,"").match(_criteria.pattern))?true:{error:"Please Provide a Valid Indian Phone Number, IT MUST TAKE THE FORM:+91XX XXXX XXXX. Spaces Aren't Required. Please Try Again\n\n"};
 ///In Case of an ERROR, RETURNS UNDEFINED

   return {error:"_phoneNumber or _criteria.pattern are UNDEFINED OR EQUAL ZERO\n\n"};
}
function _validateLocation(_location,_criteria={}){
  //Match the pattern first, IF EXISTS:
   if(_location?.longitude&& _location?.latitude){
    //FURTHER INVESTIGATION AND VALIDATION BEFORE RETURNING TRUE:

    //RETURN VALID:
    return true;
   }

 // if(_criteria.pattern) return _location.replaceAll(/\s+/g,"").match(_criteria.pattern);
 ///In Case of an ERROR, RETURNS UNDEFINED

   return {error:"Longitude and Latitude Attributes Must be Provided. Either one or Both of them Are missing!\n\n"};

}
function _validatePINCode(_PIN,_criteria={pattern:/\d{6}/}){
 //Check if enterd PIN matches the format of an Indian PIN Code
  
 if(_criteria.pattern&&_PIN){
  return (String(_PIN).match(_criteria.pattern))?true:{error:"Please Enter A Valid PIN Code, IT MUST TAKE THE FORM:XXX-XXX. DON'T INCLUDE DASH('-') NOR SPACES Please Try Again\n\n"};
  }
   ///In Case of an ERROR, RETURNS UNDEFINED

   return {error:"_PIN or _criteria.pattern are UNDEFINED OR EQUAL ZERO"};
}
async function _temp_getNextRequiredCustomerInfo(currentInfoPassed){
  const RequiredPiecesOfInfo=[
        ["Phone","📞 Send Phone Number",],
        ["Location","📍 Send Location,Full Address & Landmark"],
        ["PIN","🔢 Enter PIN Code"],
    ]
     const {userInput,userID,opCode}=currentInfoPassed
  //   console.log("currentInfoPassed: ",typeof(currentInfoPassed),currentInfoPassed.userID)
     
      /*VALIDATE THE DATA:
      --> * Check whether received opCode exists or NOT, IF NOT, return an {error: "OP_Code sent Doesn't exist"}:
       * Check if the user already exists in th LOCAL DATABASE,IF TRUE, then return an object containing the user object (for example {cust_id:1121, phone:'+2232130123', PIN:'212123', location:'223123,12123'}). IF FALSE, then continue:
       * Validate the piece of data according to its function:
       * Return true back true if everything has gone smoothly, or an {error:ERROR_MESSAGE} if not validated:
      **/
     
         //Update Database, Local and global:

     // * Validate the piece of data according to its function:
       let validatedDataStatus;
       if((opCode==undefined|| opCode==null)|| opCode>=RequiredPiecesOfInfo.length){console.log(`[VALIDATION ERROR] opCode ${opCode} Doesn't exist in the list`); return {error:"Passed opCode doesn't exist in server list!"}}
       switch(opCode){
         case 0:
           validatedDataStatus= _validatePhoneNumber(userInput);
           if(validatedDataStatus==true){
               UpdateDatabase("CUSTOMER",{userID,phone:userInput})
           }
           break;
         case 1:
           validatedDataStatus= _validateLocation(userInput)
           if(validatedDataStatus==true){
                UpdateDatabase("CUSTOMER",{userID,location:userInput})
             }
           break;
        case 2:
           validatedDataStatus= _validatePINCode(userInput)
           if(validatedDataStatus==true){
              UpdateDatabase("CUSTOMER",{userID,PIN:userInput})
            }
           break;
        case "confirm":
          validatedDataStatus= true
          UpdateDatabase("CUSTOMER",{userID},{global:true,targetData:"all"})
           break;
       }

        //* Return true back true if everything has gone smoothly, or an {error:ERROR_MESSAGE} if not validated:
       if(validatedDataStatus==true){

         //STORE THEM LOCALLY:

 

       }else{


       } 


     //UPLOAD TO DATA BASE:
      
     //CONFIRM REGISTERATION:
 //End Function 
  return validatedDataStatus
}



function awaitRequestBody(_req){
  let _toReturnData="";
  return new Promise((res,rej)=>{
  _req.on("data",(_data)=>{console.log(_data);_toReturnData+=_data});
  _req.on("end",()=>{
    res(JSON.parse(_toReturnData)); 
    });
  })
  
}

async function onGetRequest(_url,_from){

}
async function onPostRequest(_url,_from,_body){

 console.log(`[POST RECEIVED]:\nFROM: ${_from}\nURL:${_url}\nBODY:\n`);
 console.log(_body);
 console.log("\n++*+*+**+*+*+*+*+*+*+**+*+*++*+");
 switch(_url){
    case "/register-customer-data/":
         console.log(`Current LOCAL DATA BASE:`);
         console.dir(LOCAL_USERS_DATABASE["CUSTOMER"]);
         console.log(`====================================================\n\n`)
       console.log("_temp_getNextRequiredCustomerInfo: ",await _temp_getNextRequiredCustomerInfo(_body));
       return JSON.stringify(await _temp_getNextRequiredCustomerInfo(_body));
        break;
    case "/login-customer/":
      console.log(`RECEIVED POST REQUEST BOD:\n`)
      console.dir(_body)
      console.log("++++++++++++++++++++++++++++++++++++");
      return (LOCAL_USERS_DATABASE["CUSTOMER"][_body?.userID])?LOCAL_USERS_DATABASE["CUSTOMER"][_body?.userID]:undefined;
      break;
    default:
      return;
 }


}
function main(){
 const requestRecieverServer= HTTP.createServer(async (_req,_res)=>{
  console.log(_req.host);
 try{
  switch(_req.method.toLowerCase()){
  case "get":
    //onGetRequest()
    break;
  case "post":
    _res.end(JSON.stringify(await onPostRequest(_req.url,_req.host,await awaitRequestBody(_req))));
    break;
  default:

  }
}catch(e){
  console.log(e);
}

 })
requestRecieverServer.listen(PreferedPort,()=>console.log(`Server is Running on Port: ${PreferedPort}`));

}


function testingArena(){
  // _validatePhoneNumber("+91 22 22122222234 5678")
 console.log(_validatePINCode("222222"))
}
//testingArena();
main();

//Axios.post("http://127.0.0.1:3000/register-customer-data/",{userID:2222,"PIN":12123});

//      
//return {call:{call:'\/customer-register-confirm', '_requiredParameters':['USER_ID']}};
