/**
 *  TagProFriends.js
 *  Friends list feature for TagPro 
 */

(function  () {
   
var isMenuShown = false;
var isHomeButtonShown = false;
var loggedIn = false;
var inLobby = false;
var loadedLobby = false;
var myTpName;


firebase.auth().onAuthStateChanged(function(user) {
   var re = /tagpro-\w+\.koalabeast.com(?!:\d)/;
   if (re.exec(document.URL)){
      buildMenu();
      if (user) {
         console.log('logged in.');
         firebase.database().ref('usersList').once('value', function(snapshot){
            if (!snapshot.hasChild(user.uid)){
               if (loggedIn){
                  var obj = {};
                  obj[user.uid] = {'friends':true, 'requests':true, 'chats':true};
                  firebase.database().ref('users').update(obj, function(error){
                     if (error){
                        console.log(error);
                     } else {
                        obj[user.uid] = myTpName;
                        console.log('Signed in new user.');
                        firebase.database().ref('usersList').update(obj, function(error){
                           getInfo(user.uid);
                           if (!isHomeButtonShown){
                              addHomeButton();
                           }
                        });
                     };
                  }); 
               } else {
                  firebase.auth().signOut();
               }
            } else {
               getInfo(user.uid);
               if (!isHomeButtonShown){
                  addHomeButton();
               }
            }
         });
         // User is signed in.
         $('#loginDiv').remove();
         firebase.database.ref('publicLobby').off();
         firebase.database().ref('/users/' + user.uid + '/friends').off();
         firebase.database().ref('/users/' + user.uid + '/requests').off();
      } else {
         getLogin();
         if (!isHomeButtonShown){
            addHomeButton();
         }
      }
   }
});


/**
 * addHomeButton
 * Adds FRIENDS button on main page, adds new user to database
 */
var addHomeButton = function(user){
   isHomeButtonShown = true;
   var button = document.createElement('li');                                 // Returning user, just add button
   $(button).html("<a style='color:#33cc33' href='#'>FRIENDS</a>").attr('id', 'FriendsButton').bind('click', showMenu).css({'margin-right':'0', 'padding-right':'0'}).insertAfter('#nav-maps'); 
};

var showMenu = function(){
   $('#FriendMenu').fadeIn(200);
   $('#notifImage').remove();
}

/**
 * buildMenu
 * Creates and shows menu outline
 */
var buildMenu = function(user){
   if (!isMenuShown){
      isMenuShown = true;
      var menu = document.createElement('div');               // Main menu wrapper
      menu.id = 'FriendMenu';
      var exit = document.createElement('button');            // Hide menu button
      $(exit).attr('id', 'exitButton').html('X').bind('click', hideMenu).addClass('butt');
      var headingDiv = document.createElement('div');         // Heading for menu
      headingDiv.id = 'menuHeadingDiv';
      $('<h4/>', {
         text: 'TagProFriends',
         id: 'friendsHeading',
         }).appendTo(headingDiv);
      $(headingDiv).attr('id', 'headingDiv').append(exit);

      var lobbyDiv = document.createElement('div');
      var lobbyHead = document.createElement('div');
      lobbyHead.id = 'lobbyHead';
      var lobbyText = document.createElement('h1');
      $(lobbyText).attr('id', 'lobbyText').text('Public Chat Lobby');
      $(lobbyHead).append(lobbyText);
      var lobbyContent = document.createElement('div');
      lobbyContent.id = 'lobbyContent';
      var lobbyInner = document.createElement('div');
      lobbyInner.id = 'lobbyInner';
      var lobbyFooter = document.createElement('div');
      lobbyFooter.id = 'lobbyFooter';
      $(lobbyContent).append(lobbyInner);
      var lobbyInput = document.createElement('textarea');
      $(lobbyInput).appendTo(lobbyFooter).attr({'id': 'lobbyInput', 'placeholder': "Please be nice and don't spam"}).bind('keypress', function(which){     // Send message on <Enter>
         if (which.keyCode == 13){
            which.preventDefault();
            if ($(this).val().length > 0 && $(this).val().length < 200){            // Make sure message isn't too long or short
               sendLobbyMessage($(this).val());
            } else {                                                                // Message too long/short, alert user
               var p = document.createElement('p');
               $(p).text('Message too long/short').hide().insertAfter(document.getElementById('lobbyInput')).css({
                  'color':'red',
                  'padding':'0',
                  'margin':'0'
               }).fadeIn(500, function() {$(this).delay(2000).fadeOut(500);});
            }  
         }  
      });
      $(lobbyDiv).attr('id', 'lobbyDiv').append(lobbyHead, lobbyContent, lobbyFooter).hide().appendTo(menu);

      $(menu).append(headingDiv).hide().appendTo(document.body);  // Show the menu      
   };
};

var getLogin = function(){
   var loginDiv = document.createElement('div');
   var emailText = document.createElement('input');
   var passText = document.createElement('input');
   var signUp = document.createElement('button');
   var signIn = document.createElement('button');
   var prompt = document.createElement('h1');

   var infoButt = document.createElement('button');
   var infoDiv = document.createElement('div');
   var infoText = document.createElement('p');
   infoDiv.id = 'infoDiv';

   $(infoText).attr('id', 'infoText').text("The email you enter doesn't have to be a real email, just formatted as one. \
      Your password is fully confidential, keep it to yourself. \
      I, Capernicus, maker of this extension don't have access to your login credentials so don't forget them!").appendTo(infoDiv);
   $(infoDiv).appendTo($('#FriendMenu')).hide();
   $(infoButt).attr('id', 'infoButt').addClass('butt').html('?').hover(function(){
      $(infoDiv).fadeIn(300);
   }, function(){
      $(infoDiv).fadeOut(200);
   });

   emailText.id = 'loginEmail';
   loginDiv.id = 'loginDiv';
   passText.id = 'loginPass';
   signUp.id = 'signUpButt';
   signIn.id = 'signInButt';
   emailText.placeholder = 'email';
   passText.placeholder = 'password';
   $(emailText).addClass('login-input');
   $(passText).addClass('login-input');
   $(prompt).text('TagProFriends Login/Signup');
   $(signUp).bind('click', handleSignUp).html('Sign up').addClass('login-submit');
   $(signIn).bind('click', toggleSignIn).html('Sign in').addClass('login-submit');
   $(loginDiv).addClass('login').append(prompt, emailText, passText, signUp, signIn, infoButt).appendTo(document.getElementById('FriendMenu'));
};

var handleSignUp = function(){
   console.log('signing up.');
   if (document.getElementById('profile-btn')){                               // If user is logged in, get their name from profile page
      $.get('http://tagpro-origin.koalabeast.com'+$('#profile-btn').attr('href'), function(err,response,data){ 
         myTpName = $(data.responseText).find('.profile-name').text().trim(); // Extract name from profile page html
         firebase.database().ref('usersList').orderByValue().equalTo(myTpName).once('value', function(snapshot){
            if (snapshot.val()){
               alert('Account with your TagPro name already exists');
            } else {
               var email = document.getElementById('loginEmail').value;
               var pass = document.getElementById('loginPass').value;
               loggedIn = true;
               firebase.auth().createUserWithEmailAndPassword(email, pass).catch(function(error) {
                  var errorCode = error.code;
                  var errorMessage = error.message;
                  if (errorCode == 'auth/weak-password') {
                     alert('The password is too weak.');
                  } else {
                     alert(errorMessage);
                  }
               });
            }
         });
      });
   } else {
      alert('Please log in to TagPro account to start using TagProFriends');
   }
};

var toggleSignIn = function(){
   if (firebase.auth().currentUser) {
     firebase.auth().signOut();
   } else {
      var email = document.getElementById('loginEmail').value;
      var pass = document.getElementById('loginPass').value;

      firebase.auth().signInWithEmailAndPassword(email, pass).catch(function(error) {
         var errorCode = error.code;
         var errorMessage = error.message;
         if (errorCode === 'auth/wrong-password') {
            alert('Wrong password.');
         } else {
            alert(errorMessage);
         }
     });
   }
};

/**
 * getInfo
 * Initializes building of menu features, subscribes to database changes for realtime interaction
 */
var getInfo = function(user){
   console.log('getting info.');
   makeFriends();                       // Build friends list and add friends modules
   makeChat();                          // Build chat module
   makeRequests();                      // Build building friend requests module
   listAllPlayers();                    // Build button that lists all players with extension

   firebase.database().ref('/users/' + user + '/friends').on('child_added', function(snapshot) {  // Subscribe to changes in user's friends list
      appendFriends(snapshot.key, snapshot.val(), user);       // Add user's friends to friends list
   });
   firebase.database().ref(/users/ + user + '/requests').on('child_added', function(snapshot){  // Subscribe to changes in user's friend requests
      addRequests(snapshot.key, snapshot.val());
   });     
};

/**
 * makeFriends
 * @param  {user's name}
 * Creates friends list & add friend divs, then calls makeRequests to make friend request div
 */
var makeFriends = function(){
   var lobbyButton = document.createElement('button');
   $(lobbyButton).attr('id', 'lobbyButton').bind('click', enterLobby).html('Enter Lobby').addClass('butt').appendTo(document.getElementById('headingDiv'));
   var friendsDiv = document.createElement('div');                       // Wrapper for friends list module
   friendsDiv.id = 'friendsDiv';
   var friendsList = document.createElement('div');                      // Content div for friends list
   var friendsHeadDiv = document.createElement('div');
   friendsHeadDiv.id = 'friendsHeadingDiv';
   var friendsText = document.createElement('h2');                       // Header text for friends list
   $(friendsText).text('FRIENDS').attr('id', 'friendsText');
   $(friendsHeadDiv).append(friendsText);
   friendsList.id = 'friendsList';
   $(friendsDiv).append(friendsHeadDiv, friendsList);
   var addFriendDiv = document.createElement('div');                     // Wrapper for add friends module
   addFriendDiv.id = 'addFriendDiv';
   var friendPrompt = document.createElement('h3');                      // Header text for add friends module
   $(friendPrompt).text('add friend').css({'margin-bottom':'0', 'transform':'translateY(40%)'});
   var addFriendHeader = document.createElement('div');                  // Header div for add friends module
   $(addFriendHeader).attr('id', 'addFriendHeaderDiv').append(friendPrompt);
   var friendText = document.createElement('input');                     // Text input for entering target player
   friendText.id = 'addFriendText';
   var friendButt = document.createElement('button');                    // Button to send friend request
   $(friendButt).html('+').addClass('butt').attr('id', 'addFriendButton').bind('click', requestFriend);
   var addFriendContent = document.createElement('div');                 // Content div for add friend module
   $(addFriendContent).attr('id', 'addFriendContentDiv').append(friendButt, friendText);
   var spacerDiv = document.createElement('div');
   spacerDiv.id = 'clearDiv';
   $(addFriendDiv).append(addFriendHeader, addFriendContent);
   $('#FriendMenu').append(friendsDiv, spacerDiv, addFriendDiv);         // Add friends list and add friends module to menu
};

/**
 * appendFriends
 * @param  {list of user's friends}
 * Populates friends list with user's friends
 */
var appendFriends = function(uid, friend, user){
   var chat = user.slice(0,8) > uid.slice(0,8) ? 'chat_'+uid.slice(0,8)+'_'+user.slice(0,8) : 'chat_'+user.slice(0,8)+'_'+uid.slice(0,8);
   var friendDiv = document.createElement('div');
   $('<p/>', {
      text: friend
   }).appendTo(friendDiv);
   $(friendDiv).addClass('friendItem').attr({'uid': uid, 'chat': chat}).bind('click', friendSelected.changeFriend).appendTo(document.getElementById('friendsList')); 
};

/**
 * makeChat
 * Creates and adds chat div
 */
var makeChat = function(){
   var chatDiv = document.createElement('div');                                 // Main wrapper for chat module
   var chatHead = document.createElement('div');                                // Header div
   chatHead.id = 'chatHeadDiv';
   var chatHeadText = document.createElement('h2');                             // Header text
   $(chatHeadText).text('CHAT').attr('id', 'chatHeadText').appendTo(chatHead);
   var chatContent = document.createElement('div');                             // Content div
   chatContent.id = 'chatContentDiv';
   var chatInput = document.createElement('textarea');                          // Input for typing message
   $(chatInput).attr({'id': 'chatInput'}).bind('keypress', function(which){     // Send message on <Enter>
      if (which.keyCode == 13){
         which.preventDefault();
         if ($(this).val().length > 0 && $(this).val().length < 200){            // Make sure message isn't too long or short
            sendMessage($(this).val());
         } else {                                                                // Message too long/short, alert user
            var p = document.createElement('p');
            $(p).text('Message too long/short').hide().insertAfter(document.getElementById('chatInput')).css({
               'color':'red',
               'padding':'0',
               'margin':'0'
            }).fadeIn(500, function() {$(this).delay(2000).fadeOut(500);});
         }  
      }  
   });
   var chatFooter = document.createElement('div');                              // Footer div
   $(chatFooter).attr('id', 'chatFooter').append(chatInput);
   $(chatDiv).attr('id', 'chatDiv').append(chatHead, chatContent, chatFooter).insertAfter('#friendsDiv');
   friendSelected.setName();
};

/**
 * sendMessage
 * @param  {message to be sent}
 * Pushes message to database chatroom
 */
var sendMessage = function(msg){
   if (friendSelected.isFriendSet()){
      var chatroom = friendSelected.getChatRoom() + '/msgs';
      var myName = friendSelected.getName();
      firebase.database().ref(chatroom).push(myName + ': ' + msg);          // Push message to chat section in database
      $('#chatInput').val('');                                    // Clear out chat input
   } else {
      $('#chatInput').val('Select friend to chat');               // User didn't select anybody to chat with
   }
}

/**
 * makeRequests
 * @param  {list of friend requests}
 * Makes and populates friend request div
 */
var makeRequests = function(){
   var requestsList = document.createElement('div');           // Main wrapper div for friend requests module
   var requestHead = document.createElement('div');            // Header div
   requestHead.id = 'requestHeadDiv';
   requestsList.id = 'requestsList';
   var requestDiv = document.createElement('div');             // Content div
   var requestPrompt = document.createElement('h3');           // Header text
   $(requestPrompt).text('friend requests').css({'margin-bottom':'0', 'transform':'translateY(40%)'}).appendTo(requestHead);
   $(requestDiv).attr('id', 'requestDiv').append(requestHead, requestsList).insertAfter('#addFriendDiv');
};

var addRequests = function(uid, name){
   var reqDiv = document.createElement('div');
   $('<h4/>', {
      text: name
   }).addClass('inlineBlock').appendTo(reqDiv);
   var acceptButt = document.createElement('button');
   $(acceptButt).html('✓').addClass('butt inlineBlock').attr({'name': name, 'uid': uid}).bind('click', acceptFriend).css('float', 'right');
   var declineButt = document.createElement('button');
   $(declineButt).html('X').addClass('butt inlineBlock').attr({'uid': uid}).bind('click', denyFriend).css('float', 'right');
   $(reqDiv).append(declineButt, acceptButt);
   $('#requestsList').append(reqDiv);  
};

/**
 * requestFriend
 * Adds user's name to targeted player's requests in database
 */
var requestFriend = function(allUserMenu){
   var reqName = $('#addFriendText').val();                                  // Get player's name to make friend request to
   if (typeof(allUserMenu) === 'string'){
      reqName = allUserMenu;
   }
   if (reqName.length > 0 && reqName.length < 13){
      var userKey = firebase.database().ref('/usersList').orderByValue().equalTo(reqName).once('value', function(snapshot){
         if (!snapshot.val()){
            var p = document.createElement('p');
            $(p).text('User does not have extension').hide().insertAfter(document.getElementById('allUsersButton')).css({
               'color':'red'
            }).fadeIn(500, function () {$(this).delay(2000).fadeOut(500, function(){this.remove()});});
         } else {
            var user = firebase.auth().currentUser;
            firebase.database().ref('/usersList/' + user.uid).once('value', function(snap){
               var obj = {};
               obj[user.uid] = snap.val();
               for (person in snapshot.val()){
                  firebase.database().ref('/users/' + person + '/requests').update(obj);   // Add user's name to player's friend requests in database
                  var p = document.createElement('p');
                  $(p).text('Request Sent').hide().insertAfter(document.getElementById('allUsersButton')).css({
                     'color':'green'
                  }).fadeIn(500, function () {$(this).delay(2000).fadeOut(500, function(){this.remove()});});
               }
            });
         }
      });
   }
   $('#addFriendText').val('');
};

/**
 * acceptFriend
 * Adds friend to user's friends in database
 */
var acceptFriend = function(){
   var friendElem = $(this);
   var hisName = friendElem.attr('name');            // Get name of player who made friend request
   var hisID = friendElem.attr('uid');
   var hisObj = {};
   hisObj[hisID] = hisName;
   var me = firebase.auth().currentUser;
   firebase.database().ref('/users/' + me.uid + '/requests').once('value', function(snapshot){
      if (snapshot.hasChild(hisID)){
         firebase.database().ref('/users/' + me.uid + '/friends').update(hisObj);
         firebase.database().ref('/usersList/' + me.uid).once('value', function(snap){
            var myObj = {};
            myObj[me.uid] = snap.val();
            firebase.database().ref('/users/' + hisID + '/friends').update(myObj, function(){
               var remObj = {}
               remObj[hisID] = null;
               firebase.database().ref('/users/' + me.uid + '/requests').update(remObj);
            });
         });
         friendElem.parent().remove();
      }
   });
};

/**
 * denyFriend
 * Removes friend request from user's requests in database
 */
var denyFriend = function(){
   var friendElem = $(this);
   var hisID = friendElem.attr('uid');
   var hisObj = {};
   hisObj[hisID] = null;
   var me = firebase.auth().currentUser;
   firebase.database().ref('/users/' + me.uid + '/requests').update(hisObj);
   friendElem.parent().remove();
};

/**
 * getName
 * Gets locally stored user's name
 */
var getName = function(){
   var p = $.Deferred();
   chrome.storage.local.get('tpName', function(data){         // Get user's locally stored name from chrome storage
      p.resolve(data);
   });
   return p.promise();
};

/**
 * friendSelected
 * Upon pressing friend in friends list, opens and retrieves chat with targeted player, subscribes to changes in chat section in database
 */
var friendSelected = (function(){
   var selected;                        // Selected friend element in friends list
   var pub = {};
   var hisName;                         // Hold selected friend's name
   var hisID;
   var isFriendSelected = false;
   var chatroom;
   var myName;

   pub.setName = function(){
      firebase.database().ref('/usersList/' + firebase.auth().currentUser.uid).once('value', function(snap){
         myName = snap.val();
      });
   };
   pub.getName = function(){
      return myName;
   };
   pub.isFriendSet = function(){        // True if any friend in friends list is selected
      return isFriendSelected;
   };
   pub.getChatRoom = function(){          // Return selected friend's name
      return chatroom;
   };
   pub.changeFriend = function(){       // Upon clicking of friend in friends list, open chat with that friend
      var chatDiv = document.getElementById('chatContentDiv');
      var myID = firebase.auth().currentUser.uid;
      firebase.database().ref(chatroom+'/msgs').off();
      isFriendSelected = true;
      $(selected).removeClass('friendSelected');
      selected = this;
      this.className = 'friendSelected';
      hisName = $(this).text();
      var hisID = $(this).attr('uid');
      $(this).children('img').remove();
      
      $(chatDiv).empty();
      var chat = myID.slice(0,8) > hisID.slice(0,8) ? 'chat_'+hisID.slice(0,8)+'_'+myID.slice(0,8) : 'chat_'+myID.slice(0,8)+'_'+hisID.slice(0,8);
      chatroom = 'chats/'+chat;
      var obj = {};
      obj[chat] = {'user1':myID, 'user2':hisID, 'msgs':true};
      firebase.database().ref('chats/').update(obj, function(){
         var chatRoomObj = {};
         chatRoomObj[chat] = true; 
         firebase.database().ref('users/'+myID+'/chats').update(chatRoomObj);
         firebase.database().ref('users/'+hisID+'/chats').update(chatRoomObj);
         firebase.database().ref(chatroom+'/msgs').on('child_added', function(snapshot){   // Subscribe to changes in corresponding chatroom in database
            var obj = {};
            obj[chat] = snapshot.key;
            firebase.database().ref('users/'+myID+'/chats/').update(obj);
            var message = snapshot.val().split(/:(.+)?/);
            if (message[0] == myName){           // If user sent message, make message sender 'me: '
               var msg = 'me: ' + message[1];
               $('<p/>', {
                  'class': 'userSentMsg',
                  text: msg,
               }).appendTo(chatDiv);         // Add message to chat list
            } else {                                   // Otherwise, just send message as normal
               $('<p/>', {
                  text: snapshot.val()
               }).appendTo(chatDiv);         // Add message to chat list
            }
            chatDiv.scrollTop = chatDiv.scrollHeight;  // Auto scroll to bottom of chat
         });
      });
         
   };
   return pub;
}());

/**
 * listAllPlayers
 * Adds button that lets user view all players with extension
 */
var listAllPlayers = function(){
   var allUsersButton = document.createElement('button');
   var allUsersDiv = document.createElement('div');
   var allUsersHeadingDiv = document.createElement('div');
   var headingText = document.createElement('h4');
   var contentDiv = document.createElement('div');

   $(headingText).text('All Users').css('color','white').appendTo(allUsersHeadingDiv)
   $(allUsersHeadingDiv).attr('id', 'allUsersHeadingDiv').appendTo(allUsersDiv);
   $(contentDiv).attr('id', 'allUsersContentDiv').appendTo(allUsersDiv)
   $(allUsersDiv).attr('id', 'allUsersDiv').bind('mouseleave', function(){
      $(this).hide();
      $('#allUsersButton').hover(function(){
         $(this).off();
         $(allUsersDiv).hide().appendTo('#FriendMenu').fadeIn(300);
      });
   });

   firebase.database().ref('/usersList/').once('value', function(snapshot){
      for (user in snapshot.val()){
         var userSpan = document.createElement('div');
         $('<p/>', {
            'class': 'inlineItem',
            text: snapshot.val()[user],
         }).appendTo(userSpan);
         var userButton = document.createElement('button');
         $(userButton).addClass('inlineItem butt').html('+').bind('click', snapshot.val()[user], function(event){
            $(this).prop('disabled',true);
            requestFriend(event.data);
         }).appendTo(userSpan);
         $(userSpan).appendTo(contentDiv);
      }
   });
   $(allUsersButton).attr('id','allUsersButton').addClass('butt').html('☰').hover(function(){
      $(this).off();
      $(allUsersDiv).hide().appendTo('#FriendMenu').fadeIn(300);
   });
   $('#addFriendContentDiv').append(allUsersButton);
};

var checkNotifications = function(user){
   var notifications = {};
   firebase.database().ref('users/'+user+'/chats').once('value', function(snapshot){
      if (typeof(snapshot.val()) === 'object'){
         var length = Object.keys(snapshot.val()).length;
         var x = 0;
         $.each(snapshot.val(), function(chat, i){
            firebase.database().ref('chats/'+chat+'/msgs').orderByKey().limitToLast(1).once('value', function(snap){
                  ++x;
                  if (snap.val()){
                     if (Object.keys(snap.val())[0] != i){
                        notifications[chat] = true;
                     } 
                  }
                  if (x == length){
                     addNotifications(user, notifications);
                  }
            });
         });
      } else {
         addNotifications(user);
      }
   });
}

var addNotifications = function(user, notifs){
   var notification = false;
   if (typeof(notifs) == 'object'){
      for (var notif in notifs){
         if (notifs[notif]){
            var img = document.createElement('img');
            img.src = chrome.extension.getURL('/img/notification.png');
            var link = $('.friendItem[chat=' + notif + ']');
            $(img).appendTo(link);
            notification = true;
         }
      }
   }
   firebase.database().ref('users/'+user+'/requests').once('value', function(data){
      if (data.val()){
         notification = true;
      }
      if (notification){
         var height = $('#FriendsButton').height();
         var img = document.createElement('img');
         img.src = chrome.extension.getURL('/img/notification.png');
         $(img).attr('id', 'notifImage').css({'height':height-10, 'margin-bottom':'5px'}).insertAfter('#FriendsButton');
      }
   });
}

/**
 * hideMenu
 * Closes menu
 */
var hideMenu = function(){
   firebase.database.ref('publicLobby').off();
   $('#FriendMenu').hide();
   isMenuShown = false;
   firebase.auth().signOut();
};

var enterLobby = function(){
   if (!loadedLobby){
      loadedLobby = true;
      firebase.database().ref('publicLobby').limitToLast(20).on('child_added', function(snap){
         var myName = friendSelected.getName();
         var message = snap.val().split(/:(.+)?/);
         if (message[0] == myName){           // If user sent message, make message sender 'me: '
            var msg = 'me: ' + message[1];
            $('<p/>', {
               'class': 'userSentMsg',
               text: msg,
            }).appendTo(document.getElementById('lobbyInner'));         // Add message to chat list
         } else {                                   // Otherwise, just send message as normal
            $('<p/>', {
               text: snapshot.val()
            }).appendTo(document.getElementById('lobbyInner'));         // Add message to chat list
         }
         document.getElementById('lobbyInner').scrollTop = document.getElementById('lobbyInner').scrollHeight;  // Auto scroll to bottom of chat
      });
   }
   if (!inLobby){
      inLobby = true;
      $('#lobbyButton').html('Friends List');
      $('#lobbyDiv').fadeIn(200);
   } else {
      firebase.database.ref('publicLobby').off();
      inLobby = false;
      $('#lobbyButton').html('Enter Lobby');
      $('#lobbyDiv').fadeOut(200);
   }
};

var sendLobbyMessage = function(msg){
   var myName = friendSelected.getName();
   firebase.database().ref('publicLobby').push(myName + ': ' + msg);          // Push message to chat section in database
   $('#lobbyInput').val('');                                                   // Clear out chat input
}

})();