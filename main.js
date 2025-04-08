const HTTPS       = require("node:https");
const TelegramAPI = require("node-telegram-bot-api");
const FileSystem  = require("node:fs");
const Axios       = require("axios");
const pause       = (duration)=>require("child_process").execSync("sleep "+(duration||1));
const CommandHandlers = {};
let   QueryToBeCalledOnMessage="";
let   PrevCallOnStack         ="";
const Globals                 ={};
let $={};
const HandlingUserInputServer= "http://127.0.0.1:3000"
const PredefinedSpecialCallValues ={
  "MSG_TEXT":   "msg.text",
  "CHAT_ID":    "msg.chat.id",
  "USERNAME":   "msg.from.username",
  "USER_ID":    "msg.from.id",
  "MSG":        "msg",
  "LOCATION":   "msg.location",
  "CHAT_ID":    "msg.chat.id"
}
let NexStepList;

//console.log("NexStepList: ",NexStepList);


/********* REUSABLE CODE ***********/


 function getAsync(..._data){
  let _httpsresponse;
  console.log(..._data);
  return new Promise ((res,reject)=>{
    HTTPS.get(_data[0], (_recievedData)=>{
        let _recievedResponseData="";
        _recievedData.on("data",(_data)=>{_recievedResponseData+=_data});
        _recievedData.on("end",()=>{res(_recievedResponseData)});
        _recievedData.on("error",(error)=>{throw new Error(error)})
    }).on("error",(error)=>{throw new Error(`[GET ASYNC ERROR]:\n${error}`)})
  })
 }




function _checkQueryToBeCalledArguments(_queryToBeCalledFormat,_parametersRequired,_args){
 console.log(`=>[PASSED TO CHECK QUERY ]=>\n${_queryToBeCalledFormat}`);
 // const _parameters = _queryToBeCalledFormat.replace(/\/\w+/,"").match(/\S*/g);
 let _evalStatus;
//IF it's an ARRAY of either a function and special values or a callback string and special values:
 if(typeof(_queryToBeCalledFormat)=="object"&& _queryToBeCalledFormat.length>0){
  console.log(_queryToBeCalledFormat[0])
  if(_queryToBeCalledFormat[0].match(/^\/.+$/)){
         _evalStatus="special-call";
  }else{
    if(typeof(eval(_queryToBeCalledFormat[0]))){    
     _evalStatus="function";
      }
    }
  }

 
 //Always Return TRUE if it's a function
 if(typeof(_queryToBeCalledFormat)=="string"){
    //Check if length match:
      console.log("Query Parameter Eval Argumets: ",_args); 
      if(_parametersRequired.length !==_args.length){_evalStatus=`**(${_parametersRequired.length}) Arguments Required; Only (${_args.length}) Recieved\n${_parametersRequired.join("\s")}**`}else{_evalStatus="direct-call"};
    //Check if types match [Later Update]:
  }
   // console.log("******************\n",typeof(eval(_queryToBeCalledFormat[0])),_evalStatus,"\n*************************")
 return _evalStatus
}
 function _reformatListKeyboardOption(_keyboardOptionData){
  if(_keyboardOptionData.type){
    //Retun an object element that's contain a text Element(string) which gonna be displayed as they keyboard headline. And type(String) with it's value(String) assigned to it.
   return {"text":_keyboardOptionData.text.replace(/\s+/,""),[_keyboardOptionData.type[0]]:_keyboardOptionData.type[1]};
  }else{
   return _keyboardOptionData.text
  }
 }
 function _reformatKeyboardOptions(_keyboardList,_settings={}){
  // ERROR HANDLING: Passing an undefined _keyboardList, then return an empty array to be used as keyboard list:
     if(!_keyboardList) return [];


  let _rowElementCounter=0
  const _rowElementCounterMax= _settings.maxRowCount||2;
  let _currentRow=0;
  let _grid=[]; //Example: [[opt1, opt2, opt3], [opt4, opt5, opt6], [opt7, opt8, op9]];

    Object.entries(_keyboardList).map(([_commandName,_keyboardListOption])=>{
    // Reset _rowElementCounter so that we can restart counting element in the current row in the _Grid
      if(_rowElementCounter>=_rowElementCounterMax){_rowElementCounter=0;_currentRow++}
       //Check if currentRow[] exists in the _grid, IF NOT then create it.
      if(!_grid[_currentRow]) _grid[_currentRow]=[];
        _grid[_currentRow].push(_reformatListKeyboardOption(_keyboardListOption));
      _rowElementCounter++;
   });
    return _grid;
 }
 function _fetchCommandObject(_enterdCommand,_refNextListOption){
  _enterdCommand=_enterdCommand.toLowerCase();
  if(!_enterdCommand.match("/")) return null;
     const commanOptionObject = (Object.entries(_refNextListOption).filter(([_commandNameList,_commandObjet])=>_commandNameList.match(_enterdCommand)));

  return  (commanOptionObject.length>=1)?commanOptionObject[0][1]:undefined
}
function _reformatPrompt(_promptUnformatted,_args={}){
  //**_args can be an Array or an Object
  console.log("_args: ",_args);

  //Return the same prompt if there's no _args(Object) to be replaced with i the original text
  // if(!Object.values(_args)[0])) return _promptUnformatted;
 // if(Object.values(_args).length ==0) return _promptUnformatted;
  console.log("_args: ",_args);
 let _littleVariableIndexCounter=0
_promptUnformatted= _promptUnformatted.replaceAll(/(?=\$\{).+(?<=\})/g,(_stringifiedVariable,_stringfiedVariableIndex)=>{
 //Remove Prantheses and Dollar Sign from the string variable: >${}<
  const  _formattedStringifiedVariable = _stringifiedVariable.match(/\w+/)[0];
  console.log("_stringfiedVariableIndex: ",_stringfiedVariableIndex);
  //Check if the provided _args is an Object or an Array and deal with it accordingly:
  if(!(_args.length>=0)){
            if (!_args[_formattedStringifiedVariable]){return "";/*throw new Error(`FROM [_reformatPrompt]:\n _args[${_formattedStringifiedVariable}] is UNDEFINED`);*/}
   return  _args[_formattedStringifiedVariable];

  }else{
       _littleVariableIndexCounter++;
       return _args[_littleVariableIndexCounter-1];

  }

})
return _promptUnformatted;
}
 function _stepOptionParser(_enterdCommand,_refNextListOption,_args={}){
   const _formattedOptionObject = {}
   const _fetchedObject= _fetchCommandObject(_enterdCommand,_refNextListOption);
    
    //ERROR Handling, Return Undefined if the enteredCommand doesnt exist:
    if(!_fetchedObject) return undefined;

       
   _formattedOptionObject.prompt=(_fetchedObject.prompt)?_reformatPrompt(_fetchedObject.prompt,_args.prompt):"";
  _formattedOptionObject["inline_keyboard"]=_reformatKeyboardOptions(_fetchedObject["inline_keyboard"]);
    _formattedOptionObject["keyboard"]=_reformatKeyboardOptions(_fetchedObject["keyboard"]);

    //Conditional Return, Depends if the Handler(Function) exists in the JSON doc or NOT:
    if(_fetchedObject.handler) _formattedOptionObject["handler"] = _fetchedObject.handler;

   return _formattedOptionObject;
 }
 function _callComponentFunctionCallback(_functionToBeCalled,...args){
 //ERROR HANDLING: If passed Function is UNDEFINED, Then return null and close the process.
  if(!_functionToBeCalled) return null;
  //Call the function with its passed arguments
   try{ 

        return _functionToBeCalled.call(null,...args)

    }catch(e){console.log(`[_callComponentFunctionCallback ERRORR]: Error Trying to Execute the passed Handler(function)\n`); throw new Error(e)}
 }
 async function _stepListOptionExecuter(_recievedCommand,ChatID, _args={}/*{prompt{-ARGS-},}*/,msg={}){
  const _reformattedListOptionObject = _stepOptionParser(_recievedCommand,NexStepList,_args);
  let _returnedData;
      //ERROR Handling, Return Undefined if the _stepOptionParser is undefined due to non-existing command doesnt exist:
    if(!_reformattedListOptionObject) return undefined;
    //Fire Callback Handler Async if sepcified in the JSON doc:
      if(_reformattedListOptionObject?.handler){
        console.log("_Handler Args: ",_args.handler);

       const _functionCallBackReturnValue =_callComponentFunctionCallback(_reformattedListOptionObject.handler,_args.handler) //_reformattedListOptionObject.handler?.call(null,((_args.handler)||null))
     

       //Check if the returned value is a promise, if it is, then deploy a primitive await mechanisim using setInterval
        if(_functionCallBackReturnValue?.then){

            //Deploy primitive "Await" mechanisim

          try{_returnedData= await _functionCallBackReturnValue}catch(e){
            console.log(`[HANDLER ERROR]:\n${e}`);
            _stepListOptionExecuter("/network_error",ChatID);
          }; 
          /*****/
          //After it fulfills, assign the outcome to _returnedData
        }else{
             _returnedData =_callComponentFunctionCallback(_reformattedListOptionObject.handler,_args.handler) //_reformattedListOptionObject.handler?.call(null,((_args.handler)||null))

        }
        console.log(`=>[Handler Execution Returned Data:]=>`);
        console.log(_returnedData);
        console.log("+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=+=\n")
       //Set a Query to be called ON MESSAGE after this query is called, for example: a user enters their name and then /request_to_change_name request is called.
       //Execute Immediately if .call is an Array an Object with a .call sub-object and a bunch of other args, that's gonna be used to create a component. Otherwise, lazy call when typed in:
       console.log(`[HANDLER CALL RETURN VALUE] ${_returnedData}\n=++++++++++++++++++++++++++++++=\n`)
       if(_returnedData?.call){

        if(!_returnedData.call.call){
          console.log(`TO BE PASSED TO CHECK QUERY: ${_returnedData.call}`);

          QueryToBeCalledOnMessage=_returnedData.call;
        }
       }
       
       //Change Global Variables and Query data accordingly:
       if(_returnedData?.prompt){
        console.log("Handler Prompt: ",_returnedData.prompt);
        //Run Through the given _args.prompt object and set new fields for new attributes, and change the value for already existing ones:
        // console.log("_fetchCommandObject(_recievedCommand,NexStepList).prompt: ",_fetchCommandObject(_recievedCommand,NexStepList).prompt)
         _reformattedListOptionObject.prompt=_reformatPrompt(_fetchCommandObject(_recievedCommand,NexStepList).prompt,_returnedData.prompt);       
      }
    }
  //Sending a static View without any additional args:
  //     console.log("================Formatted Data To Be Parsed====================\n")
  // console.dir(_reformattedListOptionObject["inline_keyboard"])
  //   console.log("=+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+==+=")
    //Only If Prompt Exist, Show a Component. Else, just call the Handler [The Handler Would be Already Called By This Point]:
    if(_reformattedListOptionObject?.prompt){
    $.sendMessage(ChatID,_reformattedListOptionObject.prompt,{
     "reply_markup":{
           "inline_keyboard":_reformattedListOptionObject["inline_keyboard"],
           "one_time_keyboard":true,
           "input_field_placeholder":"Just Think Thoroughly Before you Type Anyting! :))"
         }
      })
    }
        //Execute Immediately if .call is an Array an Object with a .call sub-object and a bunch of other args, that's gonna be used to create a component. Otherwise, lazy call when typed in:
    if(_returnedData?.call?.call){
   //   QueryToBeCalledOnMessage=_returnedData.call.call;
        const _command = _returnedData.call.call;
        delete _returnedData.call.call;
        //Parse Required Pararms from msg object and append them to "handler" params(or create new one):
         if(!_returnedData.call.handler) _returnedData.call.handler={};
          if(_returnedData.call._requiredParameters){
           console.log("++++++++++++++++VALID QUERY CALL WITH SPECIAL VALUES+++++++++++++++=")
             const _requiredParameters=_returnedData.call._requiredParameters;
              _SpecialArgumentsParsed= _requiredParameters.map((_SpecialArgumentsUnParsed)=>eval(PredefinedSpecialCallValues[_SpecialArgumentsUnParsed])) //_parseSpecialArguments(QueryToBeCalledOnMessage[1])
               //ADD Each Key to the _returnedData.call.handler with its value assigned to it before execution
                _requiredParameters.map((_requiredParamName,_indexParam)=>{
                 console.log([_requiredParamName,_SpecialArgumentsParsed[_indexParam]]);
               _returnedData.call.handler[_requiredParamName]=_SpecialArgumentsParsed[_indexParam]
          })
          }

        //First Delete the call attribute and pass the rest of the args
            setTimeout(()=>_stepListOptionExecuter(_command,ChatID,_returnedData.call),250);
    }
       
    //"keyboard":_reformattedListOptionObject["keyboard"],
  return true;

 }



/**************** TESTING ARENA *********************/
async function  testingArena(){
// console.log("Reformatted Key List OPTION: ",_reformatListKeyboardOption({
//        "title": "<- Back ",
//        "type":["callback_data","assssed"],
// 
//     }));
// 
// console.log("Reformatted Key LIST: ",_reformatKeyboardOptions(
//   {
//     "/back":{
//        "title": "<- Back ",
//        "type":["callback_data","assssed"]
// 
//     },
//     "/homepage,/mainmenu":{
//        "title": "Homepage",
//        "type":["callback_data","asdasda"]
//     },
//     "/logout":{
//       "title": "Logout 💻",
//        "type":["callback_data","asdasdasdasd"]
//     },
//     "/ping":{
//       "title":"Just testing Out"
//     }
//    }
//   ))
// 
 //console.log("Fetched Command: ",_fetchCommandObject("/start",NexStepList))

  ///console.log("Reformatted Text: ",_reformatPrompt("Hi ${Username}, Please Pick Your Role",{Username:"nadia"}))
  //console.log("Starting the Whole operation Logic Returned: ",_stepOptionParser("/start",NexStepList,_args={prompt:{Username:"nadia"}}))
//_stepListOptionExecuter("/start","5748695304")
}
//testingArena();


/****************************************************/ 

/**************** TESTING ***************************/
//getAsync("https://echo.free.beeceptor.com").then((resData)=>console.log(`[GET ASYNC DATA]:\n${resData}`))
// postAsync("https://echo.free.beeceptor.com","BALAD EL YA HOUOUD").then((resData)=>console.log(`[POST ASYNC DATA]:\n${resData}`))
/**************** TESTING ***************************/

/** Add A couple Functionality **/
     $.sendRaw= async (command,payload,add)=>{
        let valueToReturn;
       if(payload){
        valueToReturn=JSON.parse(await HTTPS.getAsync(`${ $.options.baseApiUrl}/bot${ $.token}/${command}`,payload));
       }else{
        valueToReturn=JSON.parse(await HTTPS.postAsync(`${ $.options.baseApiUrl}/bot${ $.token}/${command}`));
       }
       return valueToReturn
    }
/***********************************/   
 /***********************************/


 function returnKeyboard(msg){
  let returnedKeys="";
  switch(msg){
  case "Pricing":
   returnedKeys=["Free", "Basic", "Premium"];
   break;
  case "File A Complaint":
       returnedKeys=["Whatsapp", "Email", "Discord"]; 
   break;
 case "Close":
     returnedKeys=[];
     break;
  default:
    returnedKeys=["Pricing","Close","File A Complaint","Report Bug"];
  }
return returnedKeys;
 }

 function returnInlineKeyboard(msg){
  let returnedInlineKeyboard=[];
   switch(msg){
   default:
    returnedInlineKeyboard.push({text:"Copy Me",copy_text:{text:"asas"}});
   }
       return returnedInlineKeyboard;

 }

function _evaluateSpecialValues(_specialValues,msg){
  //ERROR HANDLING: IF Special Values is an empy Array or undefined, then return undefined:
  if(!_specialValues?.length){
  return undefined;
  }


 return _specialValues.map((_SpecialArgumentsUnParsed)=>{
              //Return Special Params Value back, if param is actually a special value:
              if(PredefinedSpecialCallValues[_SpecialArgumentsUnParsed]){
                 return eval(PredefinedSpecialCallValues[_SpecialArgumentsUnParsed])
              }else{
                //If It doesn't exist, then evaluate it and pass it down as handler arguments:D
               return eval( `_SpecialArgumentsUnParsed`,_SpecialArgumentsUnParsed);
              }
            })
}


async function botRunner(TelegramBotInstance){
/*************************************************/

$.on("message",(msg)=>{

  // console.log("Message Recieved | Houdini Bot")
   console.log(msg);
  //Check for Message type and content and proceed to the right action:
   console.log("On message QueryToBeCalledOnMessage: ",QueryToBeCalledOnMessage);
    // First check if there's no waiting query to be called on message.
    if(QueryToBeCalledOnMessage){
        //Check if the arguments match the format requested by the query, then execute:
      {
        // console.log("QueryToBeCalledOnMessage: \t",QueryToBeCalledOnMessage);
              // console.log(QueryToBeCalledOnMessage.replace(/\/\S+/,"").match(/\S+/g));

       const _typedArguments = (typeof(QueryToBeCalledOnMessage[0])=="string" &&msg.text)?(msg.text.replace(/\/\w+/,"").split(/\s+/).filter(text=>text)):undefined;
        const _requiredParameters = (typeof(QueryToBeCalledOnMessage[0])=="string")?QueryToBeCalledOnMessage[0].replace(/\/\S+/,"").match(/\S+/g):undefined;
        let   _SpecialArgumentsParsed;
        console.log("UnParsed Special Arguments: ", QueryToBeCalledOnMessage[1])
        const _callbackQueryCheckStatus=_checkQueryToBeCalledArguments([QueryToBeCalledOnMessage[0],QueryToBeCalledOnMessage[1]],_requiredParameters, _typedArguments);
          if("special-call,function".match(_callbackQueryCheckStatus)){
            _SpecialArgumentsParsed= _evaluateSpecialValues(QueryToBeCalledOnMessage[1],msg);
          }
          //IF it's a query direct call or a function call with special arguments, then parse those arguments and pass them as "args.handler" for a query call, or directly to the function called:

         switch(_callbackQueryCheckStatus){
            case "direct-call":
            //IF everything is checked and looking good:
              console.log("Object.fromEntries: ",Object.fromEntries(_requiredParameters.map((_requiredParamName,_indexParam)=> [_requiredParamName,_typedArguments[_indexParam]])))
               //Call The Required Query:
                _stepListOptionExecuter(QueryToBeCalledOnMessage.match(/\/\S+/)[0],msg.chat.id,{
                     handler:Object.fromEntries(_requiredParameters.map((_requiredParamName,_indexParam)=>{console.log([_requiredParamName,_typedArguments[_indexParam]]);return [_requiredParamName,_typedArguments[_indexParam]]}))
                 },msg)
               //Reset QueryToBeCalledOnMessage:
                 QueryToBeCalledOnMessage=undefined;
                 break;

             case "function":
              console.log("Function Option is called")
             QueryToBeCalledOnMessage[0].call(null,..._SpecialArgumentsParsed);
              //Reset QueryToBeCalledOnMessage:
             QueryToBeCalledOnMessage=undefined;
             break;
               // break;

              case "special-call":
                  _stepListOptionExecuter(QueryToBeCalledOnMessage[0],msg.chat.id,{
                     handler:{"specialCall":_SpecialArgumentsParsed}
                 },msg)
              //Reset QueryToBeCalledOnMessage:
              QueryToBeCalledOnMessage=undefined;

                break;
            default:
             //IF returns a text error:

             _stepListOptionExecuter("/callback_error",msg.chat.id,{prompt:{error:_callbackQueryCheckStatus}});
             //It will wait for another prompt to be passed, and re-execute
        }
      }
      return true;
    }

    //First if it's a direct command call, send a query containing the call command and anything else typed as arguments to handler{}
    if(msg.text?.match(/^\/.*/)){
      const _typedArguments = (msg.text.replace(/\/\w+/,"").split(/\s+/).filter(text=>text));
      console.log("_typedArguments: ",_typedArguments)
      const _command = msg.text.match(/\/\S+/)[0]
      console.log("Command: ",_command);
      if(_fetchCommandObject(_command,NexStepList)){
            _stepListOptionExecuter(_command,msg.chat.id,{
                     handler:_typedArguments
                 })

      }else{
        console.log("Unknown cOMMAND");
          _stepListOptionExecuter("/help",msg.chat.id,{
            prompt:{
              "error":"**Unknown Command/Value.**",
              "commands":`**${Object.keys(NexStepList).join(",\n")}**`
            }
          })

      }

    }else{
      //IF Raw Text was send WHILE NO QUERY IS AWAITING:
          _stepListOptionExecuter("/help",msg.chat.id,{
            prompt:{
              "error":"**Unknown Command/Value.**",
              "commands":Object.keys(NexStepList).join(",\n")
            }
          })    }

  // _stepListOptionExecuter(msg.text,msg.chat.id,{
  //   prompt:{
  //     "username":"@"+msg.from.username
  //   }
  // })
/*  */
  // console.log(returnInlineKeyboard(msg.text));
  //   TelegramBotInstance.sendMessage(ChatID,`Done`,
  //     "parse-mode":"HTML",
  //    	 "reply_markup":{
  //          "inline_keyboard":[returnInlineKeyboard(msg.text)],
  //          "keyboard":[returnKeyboard(msg.text)],
  //          "one_time_keyboard":true,
  //          "input_field_placeholder":"Just Think Thoroughly Before you Type Anyting! :))"
  //     	 }
  //     })



})
/*************************************************/
$.on("callback_query",(_query)=>{
   console.log("_query: ", _query.data,_query);
   const _passedArguments =_query.data.replace(/^\/\S+/,"").match(/\S+/g);
   const _SpecialArgumentsParsed   = _evaluateSpecialValues(_passedArguments,_query.message);
   const _handlerArgs={};
   _handlerArgs.specialCall=_SpecialArgumentsParsed;


    console.log(_passedArguments, "\+++++++++++",_SpecialArgumentsParsed);
  console.log(`[CALL_BACK QUERY SPECIAL VALUES]: ${(_SpecialArgumentsParsed)}`)
  //Cancel The current Callback query if another button is clicked. We Know buttons since the only time this event is emitted is where a button is clicked:
   console.log("QueryToBeCalledOnMessage When button is clicked: ",QueryToBeCalledOnMessage);
   console.log(`QUERY_BACK_CALL_PASSED HANDLER ARGS: `);
   console.log(((_SpecialArgumentsParsed)?{"specialCall":_SpecialArgumentsParsed}:{}))
 const _callBackFiredResponse= _stepListOptionExecuter(_query.data.match(/^\/\S+/,"")[0],_query.message.chat.id,{handler:_handlerArgs},_query.message)
   
  if(!_callBackFiredResponse){
      //ERROR HANDLING, since this is a callback_quer, means it was fired by another keyboard button, then we can safely assume that the command given is still under construction, and doesn't have a configuration yet :).
    _stepListOptionExecuter("/under-construction",_query.message.chat.id)
  }
     QueryToBeCalledOnMessage=undefined;
 // ERROR HANDLING: Must answer to the callback query to prevent it from infinite loading:
   $.answerCallbackQuery(_query.id);
 return;
});

/*************************************************/

$.on('polling_error', error => console.log(error))
}
// 
// 
// 
// function _getDeepestElement([ChildObject, recData]){
//   console.log("ChildObject: ",ChildObject,"\nrecData: ",recData);
//    //IF the current passed object doesn't have any children, then stop the recursive function by returning NULL
//     if(!Object.values(ChildObject).length) return [null,null];
//     const [ChildObjectKey,ChildObjectChildren] = Object.entries(ChildObject)[0];
//     console.log("recData: ",recData,"\nChildObjectChildren: ", ChildObjectChildren,"\n Length: ",Object.values(ChildObjectChildren).length);
//       //Check if the current ChildObject, that means its actually the value returned by the object
//         //In That case, send a signal to the previous call to grab this value and return it;
// 
// 
//       //Check if the key of the object exist by checking if the passed object contains only one element of type object:
//      
//          console.log("\n=======================\n",
//           Object.entries(ChildObject).length!==1,
//           typeof(ChildObjectChildren)!=="object",
//           ChildObjectChildren.length>=0,
//           "\n=======================================\n"
//           )
//      if( Object.entries(ChildObject).length!==1 ||  (typeof(ChildObjectChildren)!=="object" /* || ChildObjectChildren.length>=0 */) ) {
//          
//         // throw new Error ("[_getDeepestElement] Error:\n ChildObject passed must contain exactly one element(object)")
//        }; 
// 
// 
//     switch(recData[0]){
//     case false: break; //Nothing to be done in this switch/case block;
//     case null:
//       // If the recursive process returns a null that means no more child in the called function, and the parent of this object should be the last index in the series:
//       return [null,ChildObjectChildren];
//       break;
//     }
//     //Our return base:
//      //If the passed Object has no more children, then return NULL to assign it as the deepest level in the tree:
//              console.log("Done HERe");
// 
//      //If there's still more in the tree, then recall the function with the child elements:
//       const [childObject,recursiveData]= _getDeepestElement([ChildObjectChildren,false]);
//    //   if(typeof(recursiveData)=="string" &&){
//           return [(ChildObjectKey+(recursiveData?"."+recursiveData:"")),recursiveData];
//  //     }
// 
//        
//    }
//    function _setObjectMultilevelAttribute(_path,_valueToSet,_Directory){
//      let _currentParent = _Directory;
//     _path.match(/(\w+[^\.])/g).map((_ObjectKey,_indexCounter,_matchedPathComponentsArray)=>{
//          //Make the current path sub object if not exisit:
//          if(!_currentParent[_ObjectKey]){
//             _currentParent[_ObjectKey]={};
//          }
//          //assign the current object the passed value:
//       if(_matchedPathComponentsArray.length-1==_indexCounter){
//        //IF Passed Value was an Object, then loop through all its children and add each to the final subobject and assign its values
//         if(typeof(_valueToSet)=="object"&&_valueToSet.length>=0){Object.entries(([_key,_value])=>_currentParent[_ObjectKey][_key]=_value); return 1}
//        //IF Passed Value wasnt object, then assign its value to the last component of the _path element:
//         _currentParent[_ObjectKey]=_valueToSet;
//         return 0;
//       }
// 
//     })
//    }

function init(){
    console.log(`[Bot Instance MAIN]:Init() is called!`)

    $= new TelegramAPI("7976082423:AAEKQWKya6b-GoukvMl2X4GkjUBSDCdUIhc",{
         polling: {
            params: {
              allowed_updates: ["message", "callback_query"], // any other update types
           }
        }
    });
           $.stopPolling({cancel:true});

//Translating The main JSON doc into a functional JS Object: 
  try{


   NexStepList=Object.fromEntries(
    Object.entries(JSON.parse(FileSystem.readFileSync("./nextStepList.json")))
    .map(([_key,objectvalue])=>{
        //Parse "handler" attribute into a JS Function Object
        try{objectvalue.handler = eval(objectvalue.handler)}catch(e){console.log(`[nextStepList.json ERROR]: Couldn't Resolve Handler at: ${_key}`); throw new Error(e) };
     return [_key,objectvalue];
    }) );
  console.log(`[Bot Instance MAIN]: StepList.json is Ready!`)
}catch(e){
  throw new Error(e);
}
//*** TESTING ARENA *****/
    botRunner($);

  console.log(`[Bot Instance MAIN]: Bot Instance Initiated and Running...`)

}

init($);
//module.exports= init;




