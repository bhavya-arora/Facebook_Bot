var cool = require('cool-ascii-faces');
var request = require('request');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
var pg = require('pg');
var path = require('path');

let mdb = require('moviedb')('///API_KEY///');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

let FACEBOOK_VERIFY_TOKEN = "?????";
let FACEBOOK_PAGE_ACCESS_TOKEN = "///FACEBOOK_ACCESS_TOKEN///";
let FACEBOOK_SEND_MESSAGE_URL = 'https://graph.facebook.com/v2.6/me/messages?access_token='+FACEBOOK_PAGE_ACCESS_TOKEN;
let MOVIE_DB_PLACEHOLDER_URL = 'http://image.tmdb.org/t/p/w185/';
let MOVIE_DB_BASE_URL = 'https://www.themoviedb.org/movie/';

//////Change this port according to you////
app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/webhook/',function(req,res){
	if(req.query['hub.verify_token'] == FACEBOOK_VERIFY_TOKEN){
		res.send(req.query['hub.challenge'])
	}
	res.send('Error, wrong token')
});

app.post('/webhook',function(req,res){
	console.log(JSON.stringify(req.body));
	if(req.body.object === 'page'){
		if(req.body.entry){
			req.body.entry.forEach(function(entry){
				if(entry.messaging){
					entry.messaging.forEach(function(messagingObject){
						var senderId = messagingObject.sender.id;
						if(messagingObject.message){
							if(!messagingObject.message.is_echo){
								var movieName = messagingObject.message.text;
							    getMovieDetails(senderId,movieName);
							}
						
						}else if(messagingObject.postback){
							console.log('Recieved postback');
							
						}
					});
				}else{
					console.log('no message key found');
				}
			});
		}else{
			console.log('no entry key found');
		}
	}else{
		
	}
	res.status(200).send();
});

function sendUIMessageToUser(senderId, elementList){
	request({
		url : FACEBOOK_SEND_MESSAGE_URL,
		method : 'POST',
		json : {
				recipient: {
                    id: senderId
                      },
                message: {
                    attachment: {
						 type: 'template',
                         payload: {
							 template_type: 'generic',
                             elements: 
							     elementList
							 
							
						}
					}
                }
			
		    }
	    },function(error,response,body){
			if(error){
			console.log('Error sending UIMESSAGE to User '+error);
		}else if(response.body.error){
			console.log('Error sending UImessage'+response.body.error);
		}
		//ignore
		});
}

function getElementObject(result){
	
	var movieName = result.original_title;
	var overview = result.overview;
	var posterPath = MOVIE_DB_PLACEHOLDER_URL + result.poster_path;
	return {
								 title : movieName,
								 subtitle : overview,
								 image_url : posterPath,
								 buttons:[
									  {
										"type":"web_url",
										"url": MOVIE_DB_BASE_URL + result.id,
										"title":"More Details"
									  }             
                                      ]
							 }
}

function sendMessageToUser(senderId,message){
    request({
	url: FACEBOOK_SEND_MESSAGE_URL,
	method:'POST',
	json:{
		recipient: {
    id: senderId
  },
  message: {
    text: message
  }
	}
	},function(error,response,body){
		if(error){
			console.log(error);
		}else if(response.body.error){
			console.log('Error sending message'+response.body.error);
		}
		//ignore
	});
}

function showTypingIndicatorToUser(senderId,isTyping){
	var senderAction = isTyping ? 'typing_on' : 'typing_off';
	request({
		url:FACEBOOK_SEND_MESSAGE_URL,
		method:'POST',
		json:{
				recipient: {
              id: senderId
                         },
             sender_action: senderAction
		}
		
	},function(error,response,body){
		if(error){
			console.log('sending Typing indicator to user '+error);
		}else if(response.body.error){
			console.log('Error sending typing indicator'+response.body.error);
		}
	});
	
}

function getMovieDetails(senderId,movieName){
	showTypingIndicatorToUser(senderId,true);
	
	var message = 'Found Details on '+movieName;
	mdb.searchMovie({ query: movieName }, (err, res) => {
		showTypingIndicatorToUser(senderId,false);
		if(err){
			console.log('Error found in moviedb'+err);
			sendMessageToUser(senderId,'Error Finding Movie '+movieName);
		}
		else{
			console.log(res);
			if(res.results){
				if(res.results.length > 0){
					var elements =[]
					var resultCount = res.results.length > 5 ? 5 : res.results.length;
					for(i=0;i<resultCount;i++){
						var result = res.results[i];
						elements.push(getElementObject(result));
					}
					sendUIMessageToUser(senderId,elements);
				
				}else{
					sendMessageToUser(senderId,'Could not find information on '+movieName);
				}
			}else{
				
	        sendMessageToUser(senderId,message);
			}
		}
    });

}

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});