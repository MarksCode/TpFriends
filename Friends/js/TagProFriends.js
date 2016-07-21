var addHomeButton = function(){
   var button = document.createElement('li');
   $(button).html("<a style='color:#33cc33' href='#'>FRIENDS</a>").attr('id', 'FriendsButton').bind('click', showMenu).insertAfter('#nav-maps');
};

var showMenu = function(){
   var menu = document.createElement('div');
   menu.id = 'FriendMenu';
   var exit = document.createElement('button');
   $(exit).attr('id', 'exitButton').html('X').bind('click', hideMenu).addClass('butt');
   var headingDiv = document.createElement('div');
   $('<h4/>', {
      text: 'TagPro Friends',
      id: 'friendsHeading',
      }).appendTo(headingDiv);
   $(headingDiv).attr('id', 'headingDiv').append(exit);
   $(menu).append(headingDiv);
   $('body').append(menu).css('box-shadow', 'inset 0 0 490px black');
   
   initDB();
   getInfo();
};

var getInfo = function(){
   $.when(getName()).then(function(args){
      if ($.isEmptyObject(args)){
         enterName();
      } else {
         makeFriends(args['name']);
      }
   });
};

var makeFriends = function(data){
   var friendsDiv = document.createElement('div');
   friendsDiv.id = 'friendsDiv';
   var friendsList = document.createElement('div');
   var friendsHeadDiv = document.createElement('div');
   friendsHeadDiv.id = 'friendsHeadingDiv';
   var friendsText = document.createElement('h2');
   $(friendsText).text('FRIENDS').attr('id', 'friendsText');
   $(friendsHeadDiv).append(friendsText);
   friendsList.id = 'friendsList';
   $(friendsDiv).append(friendsHeadDiv, friendsList); // Friends Div
   var addFriendDiv = document.createElement('div');
   addFriendDiv.id = 'addFriendDiv';
   var friendPrompt = document.createElement('h3');
   $(friendPrompt).text('add friend').css({'margin-bottom':'0', 'transform':'translateY(40%)'});
   var addFriendHeader = document.createElement('div');
   $(addFriendHeader).attr('id', 'addFriendHeaderDiv').append(friendPrompt);
   var friendText = document.createElement('input');
   friendText.id = 'addFriendText';
   var friendButt = document.createElement('button');
   $(friendButt).html('+').addClass('butt').attr('id', 'addFriendButton').bind('click', requestFriend);
   var addFriendContent = document.createElement('div');
   $(addFriendContent).attr('id', 'addFriendContentDiv').append(friendButt, friendText);
   var spacerDiv = document.createElement('div');
   spacerDiv.id = 'clearDiv';
   $(addFriendDiv).append(addFriendHeader, addFriendContent);
   $('#FriendMenu').append(friendsDiv, spacerDiv, addFriendDiv);
   firebase.database().ref('/users/' + data).once('value').then(function(snapshot) {
      appendFriends(snapshot.val()['friends']);
      makeChat();
      makeRequests(snapshot.val()['requests']);
   });
};

var appendFriends = function(friends){
   if (friends === 'none'){
      $('<p/>', {
         id: 'defaultFriend',
         addClass: 'friendItem',
         text: 'Add some friends!'
      }).appendTo(document.getElementById('friendsList'));
   } else {
      for (friend in friends){
         $('<p/>', {
            addClass: 'friendItem',
            text: friend
         }).appendTo(document.getElementById('friendsList')).bind('click', friendSelected.changeFriend);
      }
   }
};

var makeChat = function(){
   var chatDiv = document.createElement('div');
   var chatHead = document.createElement('div');
   chatHead.id = 'chatHeadDiv';
   var chatHeadText = document.createElement('h2');
   $(chatHeadText).text('CHAT').attr('id', 'chatHeadText').appendTo(chatHead);
   var chatContent = document.createElement('div');
   chatContent.id = 'chatContentDiv';
   var chatInput = document.createElement('textarea');
   $(chatInput).attr({'id': 'chatInput'}).bind('keypress', function(which){
      if (which.keyCode == 13){ sendMessage($(this).val());}     
   });
   var chatFooter = document.createElement('div');
   $(chatFooter).attr('id', 'chatFooter').append(chatInput);
   $(chatDiv).attr('id', 'chatDiv').append(chatHead, chatContent, chatFooter).insertAfter('#friendsDiv');
};

var makeRequests = function(requests){
   var requestsList = document.createElement('div');
   var requestHead = document.createElement('div');
   requestHead.id = 'requestHeadDiv';
   requestsList.id = 'requestsList';
   var requestDiv = document.createElement('div');
   var requestPrompt = document.createElement('h3');
   $(requestPrompt).text('friend requests').css({'margin-bottom':'0', 'transform':'translateY(40%)'}).appendTo(requestHead);
   if (requests === 'none'){
   } else {
      for (request in requests){
         var reqDiv = document.createElement('div');
         $('<h4/>', {
            text: request
         }).addClass('inlineItem').appendTo(reqDiv);
         var acceptButt = document.createElement('button');
         $(acceptButt).html('✓').addClass('butt inlineItem').attr('id', request).bind('click', acceptFriend).css('float', 'right');
         var declineButt = document.createElement('button');
         $(declineButt).html('X').addClass('butt inlineItem').attr('id', request).bind('click', denyFriend).css('float', 'right');
         $(reqDiv).append(declineButt, acceptButt);
         $(requestsList).append(reqDiv);
      }
   }
   $(requestDiv).attr('id', 'requestDiv').append(requestHead, requestsList).insertAfter('#addFriendDiv');
};

var sendMessage = function(msg){
   var hisName = friendSelected.getFriend();
   $.when(getName()).then(function(args){
      if ($.isEmptyObject(args)){
         return;
      } else {
         var chatroom = args['name'] > hisName ? 'chats/chat_'+hisName+'_'+args['name'] : 'chats/chat_'+args['name']+'_'+hisName;
         firebase.database().ref(chatroom).push(msg);
      }
   });
}

var acceptFriend = function(){
   var friendElem = $(this);
   var hisName = friendElem.attr('id');
   $.when(getName()).then(function(args){
      if ($.isEmptyObject(args)){
         return;
      } else {
         var myName = args['name'];
         var obj = {};
         obj[hisName] = true;
         var obj3 = {};
         obj3[hisName] = null;
         firebase.database().ref('/users/' + myName + '/requests').once('value', function(snapshot){
            if (snapshot.hasChild(hisName)){                                                                // check request exists
               firebase.database().ref('/users/' + myName + '/friends').update(obj).then(function(){        // add user to my friends
                  firebase.database().ref('/users/' + myName + '/requests').update(obj3);                   // remove request
                  var obj2 = {};
                  obj2[myName] = true;
                  firebase.database().ref('/users/' + hisName + '/friends').update(obj2).then(function(){   // add me to user
                     friendElem.parent().remove();
                     $('#defaultFriend').remove();
                     $('<p/>', {
                        addClass: 'friendItem',
                        text: hisName
                     }).appendTo(document.getElementById('friendsList')).bind('click', friendSelected.changeFriend);
                     
                  });
               });
            };
         });
      };
   });
};

var denyFriend = function(){
   var friendElem = $(this);
   var hisName = friendElem.attr('id');
   $.when(getName()).then(function(args){
      if ($.isEmptyObject(args)){
         return;
      } else {
         var myName = args['name'];
         firebase.database().ref('/users/' + myName + '/requests').once('value', function(snapshot){
            if (snapshot.hasChild(hisName)){                                                                // check request exists
               var obj = {};
               obj[hisName] = null;
               firebase.database().ref('/users/' + myName + '/requests').update(obj).then(function(){
                  friendElem.parent().remove();
               });
            };
         });
      };
   });
};

var enterName = function(){
   var nameDiv = document.createElement('div');
   nameDiv.id = 'nameDiv';
   var prompt = document.createElement('h1');
   $(prompt).text('Enter your TagPro name').attr('id','namePrompt');
   var nameField = document.createElement('input');
   $(nameField).attr({'id':'nameField', 'type':'text'});
   var nameButton = document.createElement('button');
   $(nameButton).attr('id', 'nameButton').html('Start').bind('click', setName).addClass('butt');
   $(nameDiv).append(prompt, nameField, nameButton);
   $('#FriendMenu').append(nameDiv);
};

var getName = function(){
   var p = $.Deferred();
   chrome.storage.local.get('name', function(data){
      p.resolve(data);
   });
   return p.promise();
};

var requestFriend = function(){
   var reqName = $('#addFriendText').val();
   if (reqName.length > 0 && reqName.length < 13){
      $.when(getName()).then(function(args){
         var name = args['name'];
         var obj = {};
         obj[name] = true;
         firebase.database().ref('/users/' + reqName + '/requests').update(obj).then(function(){
            console.log('db updated');
         });
      });
   }
};

var setName = function(){
   var name = $('#nameField').val();
   if (name.length > 0 && name.length < 13){
      chrome.storage.local.set({'name':name}, function(){
         chrome.storage.local.set({'nameSet':1}, function(){
            console.log('name set.');
            var dbRef = firebase.database().ref('users');
            var obj = {};
            obj[name] = {'friends':'none', 'requests':'none'};
            dbRef.update(obj).then(function(){
               console.log('db updated');
               $('#nameDiv').remove();
               getInfo();
            });
         });
      });
   }
};

var friendSelected = (function(){
   var selected;
   var pub = {};
   var hisName;
   var isFriendSelected = false;
   pub.isFriendSet = function(){
      return isFriendSelected;
   };
   pub.getFriend = function(){
      return hisName;
   };
   pub.changeFriend = function(){
      isFriendSelected = true;
      $(selected).removeClass('friendSelected');
      selected = this;
      this.className = 'friendSelected';
      hisName = $(this).text();
      $.when(getName()).then(function(args){
         if ($.isEmptyObject(args)){
            return;
         } else {
            var chatroom = args['name'] > hisName ? 'chats/chat_'+hisName+'_'+args['name'] : 'chats/chat_'+args['name']+'_'+hisName;
            firebase.database().ref(chatroom).on('value', function(snapshot){
               for (var msg in snapshot.val()){
                  $('<p/>', {
                     text: snapshot.val()[msg]
                  }).appendTo('#chatContentDiv');
               
               };
            });
         };
      });
   };
   return pub;
}());

var hideMenu = function(){
   chrome.storage.local.clear(function() {
      var error = chrome.runtime.lastError;
      if (error) {
         console.error(error);
      }
   });
};

var initDB = function(){
   var config = {
      apiKey: "AIzaSyAmQEhN7xnI49dZzup3jwvUc0B6SB-OH3w",
      databaseURL: "https://tagprofriends.firebaseio.com"
   };
   firebase.initializeApp(config);
};


addHomeButton();
