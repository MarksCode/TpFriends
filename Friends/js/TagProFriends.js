/**
 *  TagProFriends.js
 *  Friends list feature for TagPro 
 *  @author Capernicus
 */

(function () {

var isMenuShown = false;
var isMenuBuilt = false;
var isMenuContent = false;
var isHomeButtonShown = false;
var loggedIn = false;
var inLobby = false;
var subLobby = false;
var isSettings = false;
var myTpName;
var onlineBuilt = false;

/**
 *  Listen for user logging in, if first time then add user to database.
 *  Once login confirmed, start building menu and add home button.
 *  If user not logged in, show login/signup form.
 */
firebase.auth().onAuthStateChanged(function(user) {
   var re = /tagpro-\w+\.koalabeast.com(?!:\d)/;
   if (re.exec(document.URL)){                           // Check user on server menu, not in game
      $.when(buildMenu()).then(function(){                  // Start building outline of menu
         if (!onlineBuilt){
            onlineBuilt = true;
            usersOnline();
         }
         if (user) {                                        // If user is logged in
            console.log('logged in.');
            firebase.database().ref('usersList').once('value', function(snapshot){
               if (!snapshot.hasChild(user.uid)){           // If database does not have user's name, add to database
                  if (loggedIn){
                     var obj = {};
                     obj[user.uid] = {'friends':true, 'requests':true, 'chats':true};
                     firebase.database().ref('users').update(obj, function(error){
                        if (error){
                           console.log(error);
                        } else {
                           obj[user.uid] = myTpName;
                           firebase.database().ref('usersList').update(obj, function(error){
                              var flairsObj = {};
                              flairsObj[myTpName] = '-1:-1:1';
                              firebase.database().ref('flairs').update(flairsObj, function(){
                                 getInfo(user.uid);            // New user added to database, build menu features
                                 if (!isHomeButtonShown){
                                    addHomeButton();           // Add home button
                                 }
                              });
                           });
                        };
                     }); 
                  } else {                                  // User is on new server
                     firebase.auth().signOut();
                  }
               } else {
                  getInfo(user.uid);                        // Build menu features
                  if (!isHomeButtonShown){ 
                     addHomeButton();                       // Add home button
                  }
               }
            });
            // User is signed in.
            $('#loginDiv').remove();                        // Remove log in div
            firebase.database().ref('/users/' + user.uid + '/friends').off(); 
            firebase.database().ref('/users/' + user.uid + '/requests').off();
         } else {                                           // User is not logged in
            getLogin();                                     // Show log in menu
            if (!isHomeButtonShown){
               addHomeButton();                             // Add home button
            }
         }
      });
   } else {
      $.when(getName()).then(function(data){
         if (!$.isEmptyObject(data) && 'friendsTpName' in data && data['friendsTpName']){
            var myRef = firebase.database().ref('online/'+data['friendsTpName']);
            myRef.set(2);
            myRef.onDisconnect().set(0);
         }
      });
   }
});


/**
 * addHomeButton
 * Adds FRIENDS button on main page
 */
var addHomeButton = function(user){
   isHomeButtonShown = true;
   var button = document.createElement('li');
   $(button).html("<a style='color:#33cc33' href='#'>FRIENDS</a>").attr('id', 'FriendsButton').bind('click', showMenu).css({'margin-right':'0', 'padding-right':'0'}).insertAfter('#nav-maps'); 
};


/**
 *  showMenu
 *  Called once user pressed home button, shows friends list
 */
var showMenu = function(){
   $('#FriendMenu').fadeIn(200);
   $('#notifImage').remove();
   $('#lobbyButton').html('Enter Lobby');
}

/**
 * formatDate
 * Gets formatted date string from unix time
 */
function formatDate(d) {
   var date = new Date(d);
   var hours = date.getHours();
   var minutes = date.getMinutes();
   // var month = date.getMonth() + 1;
   // var day = date.getDate();
   var ampm = hours >= 12 ? 'pm' : 'am';
   hours = hours % 12;
   hours = hours ? hours : 12; // the hour '0' should be '12'
   minutes = minutes < 10 ? '0'+minutes : minutes;
   // var strTime = month + '/' + day + ' ' + hours + ':' + minutes + ' ' + ampm;
   var strTime = hours + ':' + minutes + ' ' + ampm;
   return strTime;
}

/**
 * getName
 * Gets locally stored username
 */
var getName = function(){
   var p = $.Deferred();
   chrome.storage.local.get('friendsTpName', function(data){
      p.resolve(data);
   });
   return p.promise();
}

/**
 * buildMenu
 * Creates menu outline
 */
var buildMenu = function(user){
   var p = $.Deferred();
   $.get(chrome.extension.getURL('html/friends.html'), function(data) {
      if (!isMenuBuilt){
         isMenuBuilt = true;
         $($.parseHTML(data)).appendTo('body');
         $('#exitButton').bind('click', hideMenu);
         $('#lobbyInput').bind('keypress', function(which){
            if (which.keyCode == 13){                                                  // Send message on <Enter>
               which.preventDefault();
               if ($(this).val().length > 0 && $(this).val().length < 200){            // Make sure message isn't too long or short
                  sendLobbyMessage($(this).val());                                     // Send message to public chat room
               } else {                                                                // Message too long/short, alert user
                  var p = document.createElement('p');
                  $(p).text('Message too long/short').hide().insertAfter(this).css({
                     'color':'red',
                     'padding':'0',
                     'margin':'0'
                  }).fadeIn(500, function() {$(this).delay(2000).fadeOut(500);});
               }  
            }  
         });
      }
      p.resolve();
   });   
   return p.promise();
};


/**
 *  getLogin
 *  Creates login menu, waits for user to sign up or log in
 */
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

/**
 *  handleSignUp
 *  Gets user's tagpro name from profile page, checks if it's already in database.
 *  Create user's account in database if name not arleady in database and if credentials are correctly formatted.
 */
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


/**
 *  toggleSignIn
 *  Tries to sign in user using inputted login credentials.
 */
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
   if (!isMenuContent){
      isMenuContent = true;
      $.when(friendSelected.setName()).then(function(){
         chrome.storage.local.set({'friendsTpName':friendSelected.getName()});
         $.get(chrome.extension.getURL('html/friendsContent.html'), function(data) {                // Inject HTML
            $($.parseHTML(data)).appendTo('#FriendMenu');
            checkNotifications(user);             // User is already in database, check for notifications
            makeFriends();                            // Build friends list and add friends modules
            makeChat();                               // Build chat module
            listAllPlayers(user);                     // Build button that lists all players with extension
            createSettings();
            firebase.database().ref('flairs').once('value', function(snap){    // Subscribe to messages sent in lobby section of database
               if (snap.val()){
                  drawFlair.setFlairs(snap.val());
               }
               firebase.database().ref('/users/' + user + '/friends').on('child_added', function(snapshot) {   // Subscribe to changes in user's friends list
                  appendFriends(snapshot.key, snapshot.val(), user);                                           // Add user's friends to friends list
               });
               firebase.database().ref('publicChat').orderByKey().limitToLast(20).on('child_added', function(snap){    // Subscribe to messages sent in lobby section of database
                  addLobbyChat(snap);
               });
               var myRef = firebase.database().ref('online/'+friendSelected.getName());
               myRef.set(1);
               myRef.onDisconnect().set(0);
            });
            firebase.database().ref(/users/ + user + '/requests').on('child_added', function(snapshot){     // Subscribe to changes in user's friend requests
               addRequests(snapshot.key, snapshot.val());                                                   // Add request to requests module
            });     
         });
      });                    // Gets user's tagpro name for later use
   }
};

/**
 * makeFriends
 * Builds friends list & add friend modules
 */
var makeFriends = function(){
   $('#lobbyButton').bind('click', enterLobby);
   $('#addFriendButton').bind('click', requestFriend);
   $("#friendsList div:nth-child(2)").css('background', 'rgba(255, 255, 255, 0.04)');
};

/**
 * appendFriends
 * @param  {user's friends}
 * Populates friends list with user's friends
 */
var appendFriends = function(uid, friend, user){
   var chat = user.slice(0,8) > uid.slice(0,8) ? 'chat_'+uid.slice(0,8)+'_'+user.slice(0,8) : 'chat_'+user.slice(0,8)+'_'+uid.slice(0,8);
   var friendDiv = document.createElement('div');
   var flairInfo = drawFlair.getFlair(friend);
   var flair = drawFlair.draw(flairInfo, true);
   flair.className = 'userFlair';
   friendDiv.appendChild(flair);
   $('<p/>', {
      text: friend
   }).appendTo(friendDiv);
   $(friendDiv).addClass('friendItem').attr({'uid': uid, 'chat': chat}).bind('click', friendSelected.changeFriend).appendTo(document.getElementById('friendsList')); 
};

/**
 * makeChat
 * Builds chat div
 */
var makeChat = function(){  
   $('#chatInput').bind('keypress', function(which){     // Send message on <Enter>
      if (which.keyCode == 13){
         which.preventDefault();
         if ($(this).val().length > 0 && $(this).val().length < 200){            // Make sure message isn't too long or short
            sendMessage($(this).val());                                          // Send message to be added to database
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
};

/**
 * sendMessage
 * @param  {message to be sent}
 * Pushes message to database chatroom
 */
var sendMessage = function(msg){
   if (friendSelected.isFriendSet()){                                       // Check user has friend selected in friends list
      var chatroom = friendSelected.getChatRoom() + '/msgs';
      var myName = friendSelected.getName();
      var obj = {};
      obj['time'] = firebase.database.ServerValue.TIMESTAMP;
      obj['msg'] = myName + ': ' + msg;
      firebase.database().ref(chatroom).push(obj);          // Push message to chat section in database
      $('#chatInput').val('');                                              // Clear out chat input
   } else {
      $('#chatInput').val('Select friend to chat');                         // User didn't select anybody to chat with
   }
}

/**
 *  addRequests
 *  Populates requests module with user's incoming friend requests
 */
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
   if (typeof(allUserMenu) === 'string'){                                    // If user requested name from all user's list, get that name
      reqName = allUserMenu;
   }
   if (reqName.length > 0 && reqName.length < 13){
      var userKey = firebase.database().ref('/usersList').orderByValue().equalTo(reqName).once('value', function(snapshot){
         if (!snapshot.val()){                                               // Check requested friend is in database, if not alert user
            var p = document.createElement('p');
            $(p).text('User does not have extension').hide().insertAfter(document.getElementById('allUsersButton')).css({
               'color':'red'
            }).fadeIn(500, function () {$(this).delay(2000).fadeOut(500, function(){this.remove()});});
         } else {                                                             // Requested friend is in database, add user's name to their request section in database
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
   var hisID = friendElem.attr('uid');               // Get uid of player who made friend request
   var hisObj = {};
   hisObj[hisID] = hisName;                          // Object with his name to add to your friends section in database
   var me = firebase.auth().currentUser;
   firebase.database().ref('/users/' + me.uid + '/requests').once('value', function(snapshot){
      if (snapshot.hasChild(hisID)){                  // Check player who made request is actually in database
         firebase.database().ref('/users/' + me.uid + '/friends').update(hisObj);         // Add friends name to your friends section in database
         firebase.database().ref('/usersList/' + me.uid).once('value', function(snap){
            var myObj = {};                                                               // Object with your name to add to friend's friends section in database
            myObj[me.uid] = snap.val();
            firebase.database().ref('/users/' + hisID + '/friends').update(myObj, function(){      // Add your name to friends section in database
               var remObj = {}                                                             // Object to remove friends name from your requests section in database
               remObj[hisID] = null;
               firebase.database().ref('/users/' + me.uid + '/requests').update(remObj);   // Remove friend from your requests section in database
            });
         });
         friendElem.parent().remove();                 // Remove friend request from menu
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
   firebase.database().ref('/users/' + me.uid + '/requests').update(hisObj);     // Remove user from your requests section of database
   friendElem.parent().remove();                                                 // Remove friend request from menu
};

/**
 * friendSelected
 * Upon pressing friend in friends list, opens and retrieves chat with targeted player, subscribes to changes in chat section in database
 * Also used to have continuously needed data on demand
 */
var friendSelected = (function(){
   var selected;                        // Selected friend element in friends list
   var pub = {};
   var hisName;                         // Hold selected friend's name
   var hisID;
   var isFriendSelected = false;
   var chatroom;
   var myName;

   pub.setName = function(){           // Get user's name from database
      var p = $.Deferred();
      firebase.database().ref('/usersList/' + firebase.auth().currentUser.uid).once('value', function(snap){
         myName = snap.val();
         p.resolve();  
      });
      firebase.database().ref('/flairs/' + myName).once('value', function(snapshot){
         if (snapshot.val()){
            flair = snapshot.val();
         }
      });
      return p.promise();
   };
   pub.getName = function(){            // Get user's tagpro name
      return myName;
   };
   pub.isFriendSet = function(){        // True if any friend in friends list is selected
      return isFriendSelected;
   };
   pub.getChatRoom = function(){        // Return current chatroom user is in
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
            if (typeof(snapshot.val()) === 'object' && 'msg' in snapshot.val()){
               var msg = snapshot.val()['msg'];
               var timestamp = formatDate( (snapshot.val()['time']) );
               var message = msg.split(/:(.+)?/);
               if (message[0] == myName){                   // If user sent message, make message sender 'me: '
                  var p = document.createElement('p');
                  p.className = 'userSentMsg';
                  p.innerHTML = '<span>['+timestamp+']</span> me: ' + message[1];
                  chatDiv.appendChild(p);
               } else {                                     // Otherwise, just send message as normal
                  var p = document.createElement('p');
                  p.innerHTML = '<span>['+timestamp+']</span> '+msg;
                  chatDiv.appendChild(p);
               }
               chatDiv.scrollTop = chatDiv.scrollHeight;    // Auto scroll to bottom of chat
            }
         });
      });
         
   };
   return pub;
}());

/**
 * listAllPlayers
 * Adds button that lets user view all players with extension
 */
var listAllPlayers = function(userId){
   var allUsersDiv = $('#allUsersDiv');
   var contentDiv = document.getElementById('allUsersContentDiv');
   allUsersDiv.bind('mouseleave', function(){                // Hide all friends list when user's mouse exits list
      $(this).hide();
      $('#allUsersButton').hover(function(){
         $(this).off();
         allUsersDiv.hide().appendTo('#FriendMenu').fadeIn(300);
      });
   });

   firebase.database().ref('/usersList/').once('value', function(snapshot){                // Get all users from database
      firebase.database().ref('users/'+userId+'/friends').once('value', function(snap){    // Get user's friends to grey out already added users
         if (snap.val()){                                                                  // Check user has friends
            var friends = Object.keys(snap.val());                                         // Create array from user's friends
            var checkFriend = true;                                                        // Flag to check for already added users set true
         }
         for (user in snapshot.val()){                                                     // Loop through users with extension, add names and request button for each one 
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
            if (checkFriend){
               if ((friends.indexOf(user)) !== -1) {                                         // If user is already user's friend, disable request button for them
                  $(userButton).prop('disabled', true);
               }
            }
            $(userSpan).appendTo(contentDiv);
         }
      });
   });
   $('#allUsersButton').hover(function(){   // Show all friends list when user hovers over button
      $(this).off();
      allUsersDiv.hide().appendTo('#FriendMenu').fadeIn(300);
   });
};

/**
 *  checkNotifications
 *  Checks if last message seen by user in each chatroom they're a part of isn't most recent message in corresponding chatroom.
 */
var checkNotifications = function(user){
   var notifications = {};
   firebase.database().ref('users/'+user+'/chats').once('value', function(snapshot){            // Get list of chatrooms user is in 
      if (typeof(snapshot.val()) === 'object'){                                                 // Check user is in any chatrooms
         var length = Object.keys(snapshot.val()).length;
         var x = 0;
         $.each(snapshot.val(), function(chat, i){                                              // Loop through each chatroom user is in, check if last seen message isn't last message in chatroom
            firebase.database().ref('chats/'+chat+'/msgs').orderByKey().limitToLast(1).once('value', function(snap){
                  ++x;
                  if (snap.val()){
                     if (Object.keys(snap.val())[0] != i){        // Compare last message seen id with last message in chatroom
                        notifications[chat] = true;               // If messages not same, set notification flag for that chatroom true
                     } 
                  }
                  if (x == length){                               // Looped through every chatroom, add notifications to menu
                     addNotifications(user, notifications);

                  }
            });
         });
      } else {                                                     // User is not in any chatrooms, add notifications to front page if user has friend requests
         addNotifications(user);
      }
   });
}

/**
 *  addNotifications
 *  Adds notification icon to chatrooms that user hasn't seen most recent message of.
 *  Add notification icon next to home button if user has any chatroom notifications or friend requests.
 */
var addNotifications = function(user, notifs){
   var notification = false;
   if (typeof(notifs) == 'object'){                               // Check if user has any chatroom notifications, if so loop through them
      for (var notif in notifs){
         if (notifs[notif]){                                      // If chatroom's notification flag set  true, add notification icon next to friends name in friends list
            var img = document.createElement('img');
            img.src = chrome.extension.getURL('/img/notification.png');
            setTimeout(function(){
               var link = $('.friendItem[chat=' + notif + ']');
               $(img).appendTo(link);
            }, 2000);
            notification = true;
         }
      }
   }
   firebase.database().ref('users/'+user+'/requests').once('value', function(data){   // Check if user has any friend requests
      if (data.val()){
         if (data.val() != true){
            notification = true;
         }
      }
      if (notification){                                          // If user has any notifications, add notification icon next to home button
         var height = $('#FriendsButton').height();
         var img = document.createElement('img');
         img.src = chrome.extension.getURL('/img/notification.png');
         $(img).attr('id', 'notifImage').css({'height':height-10, 'margin-bottom':'5px'}).insertAfter('#FriendsButton');
      }
   });
}

/**
 * usersOnline
 * Adds content for users online feature, listens for changes in users online section of database.
 */
var usersOnline = function(){
   var onlineDiv = $('#onlineDiv');
   var onlineButton = $('#onlineButton');
   var onlineContent = document.getElementById('onlineContentDiv')
   document.getElementById('onlineImg').src = chrome.extension.getURL('img/usersOnline.png');

   firebase.database().ref('online').on('child_added', function(snap){
      switch (snap.val()){
         case 1:                                          // User in lobby
            var userDiv = document.createElement('div');
            userDiv.id = snap.key;
            var name = document.createElement('p');
            name.innerHTML = snap.key;
            var status = document.createElement('p');
            status.innerHTML = 'In Lobby';
            status.className = 'onlineStatus';
            $(userDiv).append(name, status).appendTo(onlineContent);
            break;
         case 2:                                          // User in game
            var userDiv = document.createElement('div');
            userDiv.id = snap.key;
            var name = document.createElement('p');
            name.innerHTML = snap.key;
            var status = document.createElement('p');
            status.innerHTML = 'In Game';
            status.className = 'onlineStatus';
            $(userDiv).append(name, status).appendTo(onlineContent);
            break;
         default:                                          // User offline
            var userDiv = document.createElement('div');
            userDiv.id = snap.key;
            var name = document.createElement('p');
            name.innerHTML = snap.key;
            var status = document.createElement('p');
            status.innerHTML = 'Offline';
            status.className = 'onlineStatus offline';
            $(userDiv).append(name, status).hide().appendTo(onlineContent);
            break;
      }
      firebase.database().ref('online').on('child_changed', function(snap){   // Listen for changes in database
         var userDiv = $('#'+snap.key);
         if (userDiv){
            var status = userDiv.children().eq(1);
            switch (snap.val()){
               case 1:   // User moved to lobby
                  $(status).text('In Lobby').removeClass('offline');
                  userDiv.show();
                  break;
               case 2:   // User now in game
                  $(status).text('In Game').removeClass('offline');
                  userDiv.show();
                  break;
               default:  // User now offline
                  $(status).text('Offline').addClass('offline');
                  userDiv.hide();
                  break;
            }
         }
      });
   });

   onlineDiv.bind('mouseleave', function(){  // Hide online list when user's mouse exits list
      $(this).clearQueue().toggle();
      onlineButton.mouseenter(function(){
         $(this).off();
         onlineDiv.clearQueue().fadeIn(300);
      });
   });
   onlineButton.mouseenter(function(){       // Show online list when user hovers over button
      $(this).off();
      onlineDiv.clearQueue().fadeIn(300);
   });

}

/**
 * hideMenu
 * Closes menu
 */
var hideMenu = function(){
   $('#lobbyDiv').hide();
   $('#settingsDiv').hide();
   $('#FriendMenu').hide();
   isMenuShown = false;
   inLobby = false;
   isSettings = false;
};

/**
 *  enterLobby
 *  Show or hide public chat lobby
 */
var enterLobby = function(){
   if (!inLobby){                                     // User entered lobby, show lobby
      inLobby = true;
      $('#lobbyButton').html('Friends List');
      $('#lobbyDiv').fadeIn(200);
      document.getElementById('lobbyInner').scrollTop = document.getElementById('lobbyInner').scrollHeight;       // Auto scroll to bottom of chat
   } else {                                           // User left lobby, hide lobby
      inLobby = false;
      $('#lobbyButton').html('Enter Lobby');
      $('#lobbyDiv').fadeOut(200);
   }
};

/**
 *   addLobbyChat
 *   Adds a message to the chat lobby
 */
var addLobbyChat = function(snapshot){
   if (typeof(snapshot.val()) === 'object' && 'msg' in snapshot.val()){
      var msgDiv = document.createElement('div');
      var flairDiv = document.createElement('div');
      $(flairDiv).appendTo(msgDiv).addClass('lobbyFlair');
      var msg = snapshot.val()['msg'];
      var message = msg.split(/:(.+)?/);
      var myName = friendSelected.getName();
      var flairInfo = drawFlair.getFlair(message[0]);
      $(flairDiv).append(drawFlair.draw(flairInfo));
      var timestamp = formatDate( (snapshot.val()['time']) );
      if (message[0] == myName){                   // If user sent message, make message sender 'me: '
         var p = document.createElement('p');
         msgDiv.className = 'userSentMsg';
         p.innerHTML = '<span>['+timestamp+']</span> me: ' + message[1];
         msgDiv.appendChild(p);
      } else {                                     // Otherwise, just send message as normal
         var p = document.createElement('p');
         p.innerHTML = '<span>['+timestamp+']</span> '+msg;
         msgDiv.appendChild(p);
      }
      $('#lobbyInner').append(msgDiv);
      document.getElementById('lobbyInner').scrollTop = document.getElementById('lobbyInner').scrollHeight;       // Auto scroll to bottom of chat
   }
}

/**
 *  sendLobbyMessage
 *  Add message to public chat lobby in database
 */
var sendLobbyMessage = function(msg){
   var myName = friendSelected.getName();
   var obj = {};
   obj['time'] = firebase.database.ServerValue.TIMESTAMP;
   obj['msg'] = myName + ': ' + msg;
   firebase.database().ref('publicChat').push(obj);          // Push message to chat section in database
   $('#lobbyInput').val('');                                  // Clear out chat input
}

/**
 *  createSettings
 *  Gets user information and add images for settings page, bind click events
 */
var createSettings = function(){
   var settingsButton = document.createElement('img');
   var src = chrome.extension.getURL('/img/cogwheel.png');
   var src2 = chrome.extension.getURL('/img/cogwheel2.png');
   $(settingsButton).attr({'id': 'settingsButton', 'src':src}).hover(function(){
      this.src = src2;
   }, function(){
      this.src = src;
   }).bind('click', openSettings).appendTo(document.getElementById('headingDiv'));

   $('#settingsExit').bind('click', openSettings);
   
   var rightURL = chrome.extension.getURL('/img/right.png');
   var leftURL = chrome.extension.getURL('/img/left.png');
   var right2URL = chrome.extension.getURL('/img/right2.png');
   var left2URL = chrome.extension.getURL('/img/left2.png');
   $('#leftButton').attr({'id': 'leftButton', 'src':leftURL}).hover(function(){
      this.src = left2URL;
   }, function(){
      this.src = leftURL;
   }).bind('click', changeSheet);
   $('#rightButton').attr({'id': 'rightButton', 'src':rightURL}).hover(function(){
      this.src = right2URL;
   }, function(){
      this.src = rightURL;
   }).bind('click', changeSheet);

   $('#flairsTable').find('td').bind('click', flairPressed);
   $('#signOutButt').bind('click', signOut);
}

/**
 *  openSettings
 *  Shows settings page and call flairs functions to highlight user's current chosen flair
 */
var openSettings = function(){
   $('#settNameText').text(friendSelected.getName());
   $('#settEmailText').text(firebase.auth().currentUser['email']);
   var myFlair = drawFlair.getFlair(friendSelected.getName()) || '-1:-1:1';
   var flairSheet = getFlairSheet(parseInt(myFlair.split(':')[2]));
   document.getElementById('flairsImg').src = flairSheet;
   if (isSettings){
      isSettings = false;
      $('#settingsDiv').hide();
   } else {
      isSettings = true;
      $('#settingsDiv').show();
   }
   disableSheet();
   highLightFlair();
}

/**
 *  signOut
 *  Signs current user out
 */
var signOut = function(){
   isMenuBuilt = false;
   isMenuContent = false;
   isSettings = false;
   onlineBuilt = false;
   var myRef = firebase.database().ref('online/'+friendSelected.getName()).set(0);
   firebase.auth().signOut();
   $('#FriendMenu').remove();
   chrome.storage.local.set({'friendsTpName':null});
}


/**
 *  flairPressed
 *  Updates users chosen flair in database, highlights flair in settings page
 */
var flairPressed = function(){
   var x = $(this).attr('x');
   var y = $(this).attr('y');
   var flairSheet = flairSheetNum(document.getElementById('flairsImg').src);
   var flairString = x+':'+y+':'+flairSheet;
   drawFlair.setMyFlair(flairString);
   var flairObj = {};
   flairObj[friendSelected.getName()] = flairString;
   firebase.database().ref('flairs/').update(flairObj);
   $('#flairsTable td').removeClass('flairSelec');
   $(this).addClass('flairSelec');
}

/**
 *  changeSheet
 *  Shows next or previous flairs sheet,  calls function to disable left or right buttons if necessary, highlights flair 
 */
var changeSheet = function(){
   var flairsImg = document.getElementById('flairsImg');
   var sheetSrc = flairSheetNum( flairsImg.src );
   if (this.id == 'leftButton'){
      flairsImg.src = getFlairSheet(--sheetSrc);
   } else {
      flairsImg.src = getFlairSheet(++sheetSrc);
   }
   disableSheet();
   highLightFlair();
}

/**
 *  highLightflair 
 *  Puts yellow border around user's chosen flair if sheet that flair is in is currently being shown
 */
var highLightFlair = function(){
   var flair = drawFlair.getFlair(friendSelected.getName()) || '-1:-1:1';
   flair = flair.split(':');
   if (flair[0] != -1 && flair[1] != -1 && flair[2] == flairSheetNum(document.getElementById('flairsImg').src)){
      $("#flairsTable td[x='" + flair[0] +"']").filter("td[y='" + flair[1] +"']").addClass('flairSelec');
   } else {
      $('#flairsTable td').removeClass('flairSelec');
   }
}

/**
 *  disableSheet
 *  Disables right or left buttons if user is seeing first or last flairs sheet
 */
var disableSheet = function(){
   var rightButt = document.getElementById('rightButton');
   var leftButt = document.getElementById('leftButton');
   var num = flairSheetNum( document.getElementById('flairsImg').src );
   if (num == 3){
      rightButt.className = 'imgDisabled';
      leftButt.className = '';
   } else if (num == 1) {
      rightButt.className = '';
      leftButt.className = 'imgDisabled';
   } else {
      rightButt.className = '';
      leftButt.className = '';
   }
}

/**
 *  getFlairSheet
 *  Gets src of flair sheet
 */
var getFlairSheet = function(num){
   switch (num){
      case 1:
         return chrome.extension.getURL('img/flairs1.png'); 
      case 2:
         return chrome.extension.getURL('img/flairs2.png');
      case 3:
         return chrome.extension.getURL('img/flairs3.png');
      default:
         return chrome.extension.getURL('img/flairs1.png');
   }
}

/**
 *  flairSheetNum
 *  Gets flair sheet number from src url
 */
var flairSheetNum = function(src){
   return parseInt(src.slice(-5, -4));
}

/**
 *  drawFlair
 *  Keeps track of all user's flairs from database, draws a user's flair on request
 */
var drawFlair = (function(){
   var pub = {};
   var flairs1 = document.createElement('img');
   var flairs2 = document.createElement('img');
   var flairs3 = document.createElement('img');
   flairs1.src = chrome.extension.getURL('img/flairs1.png');
   flairs2.src = chrome.extension.getURL('img/flairs2.png');
   flairs3.src = chrome.extension.getURL('img/flairs3.png');
   var flairs;
   var myFlair;

   pub.draw = function(src, big = false){
      var r = document.createElement("canvas");
      if (big){
         r.width = 32, r.height = 32;
      } else {
         r.width = 16, r.height = 16;
      }
      if (typeof(src) == 'string'){
         var flair = src.split(':');
         if (flair[0] != -1 && flair[1] != -1){
            if (big){
               var i = r.getContext("2d");
               if (flair[2] == 1){
                  i.drawImage(flairs1, flair[0] * 16, flair[1] * 16, 16, 16, 0, 0, 32, 32);
               } else if (flair[2] == 2) {
                  i.drawImage(flairs2, flair[0] * 16, flair[1] * 16, 16, 16, 0, 0, 32, 32);
               } else {
                  i.drawImage(flairs3, flair[0] * 16, flair[1] * 16, 16, 16, 0, 0, 32, 32);
               }
            } else {
               var i = r.getContext("2d");
               if (flair[2] == 1){
                  i.drawImage(flairs1, flair[0] * 16, flair[1] * 16, 16, 16, 0, 0, 16, 16);
               } else if (flair[2] == 2) {
                  i.drawImage(flairs2, flair[0] * 16, flair[1] * 16, 16, 16, 0, 0, 16, 16);
               } else {
                  i.drawImage(flairs3, flair[0] * 16, flair[1] * 16, 16, 16, 0, 0, 16, 16);
               }
            }
         }
      }
      return r;
   }

   pub.setFlairs = function(flrs){
      flairs = flrs;
      myFlair = flrs[friendSelected.getName()] || '-1:-1:1';
   }

   pub.getFlair = function(user){
      if (user in flairs){
         return flairs[user];
      } else {
         return '-1:-1:1';
      }
   }

   pub.getMyFlair = function(){
      return myFlair || '-1:-1:1';
   }

   pub.setMyFlair = function(flr){
      myFlair = flr;
   }

   return pub;
})();

})();