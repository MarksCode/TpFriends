/**
 *  TagProFriends.js
 *  Friends list feature for TagPro 
 */

(function  () {
   
var isMenuShown = false;

firebase.auth().onAuthStateChanged(function(user) {
   if (user) {
      // User is signed in.
      initUser(user.uid); 
   } else {
      console.log("Signing in.");
      firebase.auth().signInAnonymously().catch(function(error) {
         console.log("unable to sign in.");
      });
   }
});

var initUser = function(user){
   firebase.database().ref("usersList").orderByKey().equalTo(user).once('value', function(data){      // Check if usersList already has uid
      if (!data.val()){
         if (document.getElementById('profile-btn')){                               // If user is logged in, get their name from profile page
            $.get('http://tagpro-origin.koalabeast.com'+$("#profile-btn").attr("href"), function(err,response,data){ 
               var name = $(data.responseText).find(".profile-name").text().trim(); // Extract name from profile page html
               var obj = {};
               obj[user] = name;
               console.log("Signed in new user.");
               firebase.database().ref("usersList").update(obj);
               obj[user] = {"friends":true, "requests":true};
               firebase.database().ref("users").update(obj);    
               addHomeButton(user);
            });
         }
      } else {
         console.log("Signed in previous user.");
         addHomeButton(user);
      }
   }
)};


/**
 * addHomeButton
 * Adds FRIENDS button on main page, adds new user to database
 */
var addHomeButton = function(user){
   firebase.database().ref('/users/' + user + '/friends').off();
   firebase.database().ref('/users/' + user + '/requests').off();
   var button = document.createElement('li');                                 // Returning user, just add button
   $(button).html("<a style='color:#33cc33' href='#'>FRIENDS</a>").attr('id', 'FriendsButton').bind('click', showMenu).insertAfter('#nav-maps'); 
};

/**
 * showMenu
 * Creates and shows menu outline, calls getInfo to start creating parts of menu
 */
var showMenu = function(){
   if (!isMenuShown){
      isMenuShown = true;
      var menu = document.createElement('div');               // Main menu wrapper
      menu.id = 'FriendMenu';
      var exit = document.createElement('button');            // Hide menu button
      $(exit).attr('id', 'exitButton').html('X').bind('click', hideMenu).addClass('butt');
      var headingDiv = document.createElement('div');         // Heading for menu
      $('<h4/>', {
         text: 'TagPro Friends',
         id: 'friendsHeading',
         }).appendTo(headingDiv);
      $(headingDiv).attr('id', 'headingDiv').append(exit);
      $(menu).append(headingDiv).hide().appendTo(document.body).fadeIn(200);  // Show the menu
      
      getInfo();   // Start building the different menu features
   };
};

/**
 * getInfo
 * Initializes building of menu features, subscribes to database changes for realtime interaction
 */
var getInfo = function(){
   $.when(getName()).then(function(args){     // Waits until Chrome local storage retrieves stored name
      if ($.isEmptyObject(args)){
         return;                              // Name not set
      } else {                                // Name is set, start building modules
         makeFriends();                       // Build friends list and add friends modules
         makeChat();                          // Build chat module
         makeRequests();                      // Build building friend requests module
         listAllPlayers();                    // Build button that lists all players with extension


         firebase.database().ref('/users/' + args['tpName'] + '/friends').on('child_added', function(snapshot) {  // Subscribe to changes in user's friends list
            appendFriends(snapshot.val());       // Add user's friends to friends list
         });
         firebase.database().ref(/users/+args['tpName']+'/requests').on('child_added', function(snapshot){  // Subscribe to changes in user's friend requests
            addRequests(snapshot.val());
         });
      }
   });
};

/**
 * makeFriends
 * @param  {user's name}
 * Creates friends list & add friend divs, then calls makeRequests to make friend request div
 */
var makeFriends = function(){
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
var appendFriends = function(friend){
   $('<p/>', {
      addClass: 'friendItem',
      text: friend
   }).appendTo(document.getElementById('friendsList')).bind('click', friendSelected.changeFriend);   
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
};

/**
 * sendMessage
 * @param  {message to be sent}
 * Pushes message to database chatroom
 */
var sendMessage = function(msg){
   if (friendSelected.isFriendSet()){
      var hisName = friendSelected.getFriend();                   // Get selected friend's name
      $.when(getName()).then(function(args){                      // Retrieve user's name from local storage
         if ($.isEmptyObject(args)){
            return;
         } else {
            var chatroom = args['tpName'] > hisName ? 'chats/chat_'+hisName+'_'+args['tpName'] : 'chats/chat_'+args['tpName']+'_'+hisName;
            firebase.database().ref(chatroom).push(args['tpName'] + ': ' + msg);          // Push message to chat section in database
         }
      });
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

var addRequests = function(request){
   if (request === 'none'){                                    // If no friend requests, do nothing
   } else {                                                    // Otherwise, populate requests list 
      var reqDiv = document.createElement('div');
      $('<h4/>', {
         text: request
      }).addClass('inlineBlock').appendTo(reqDiv);
      var acceptButt = document.createElement('button');
      $(acceptButt).html('✓').addClass('butt inlineBlock').attr('id', request).bind('click', acceptFriend).css('float', 'right');
      var declineButt = document.createElement('button');
      $(declineButt).html('X').addClass('butt inlineBlock').attr('id', request).bind('click', denyFriend).css('float', 'right');
      $(reqDiv).append(declineButt, acceptButt);
      $('#requestsList').append(reqDiv); 
   }
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
      firebase.database().ref('/users/').once('value', function(snapshot){   // Check requested player is in database
         if (snapshot.hasChild(reqName)){
            $.when(getName()).then(function(args){                           // Retrive user's name from chrome local storage
               if (reqName !== args['tpName']){                                // User not trying to add himself
                  var obj = {};
                  obj[args['tpName']] = args['tpName'];
                  firebase.database().ref('/users/' + reqName + '/requests').update(obj);   // Add user's name to player's friend requests in database
                  var p = document.createElement('p');
                  $(p).text('Request Sent').hide().insertAfter(document.getElementById('addFriendText')).css({
                     'color':'green'
                  }).fadeIn(500, function () {$(this).delay(2000).fadeOut(500);});
               }
            });
         } else {                                                            // Requested player is not in database, alert user 
            var p = document.createElement('p');
            $(p).text('User does not have extension').hide().insertAfter(document.getElementById('addFriendText')).css({
               'color':'red'
            }).fadeIn(500, function () {$(this).delay(2000).fadeOut(500);});
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
   var hisName = friendElem.attr('id');            // Get name of player who made friend request
   $.when(getName()).then(function(args){          // Get user's name from chrome local storage
      if ($.isEmptyObject(args)){
         return;
      } else {
         var myName = args['tpName'];
         var obj = {};
         obj[hisName] = hisName;
         var obj2 = {};
         obj2[hisName] = null;
         firebase.database().ref('/users/' + myName + '/requests').once('value', function(snapshot){
            if (snapshot.hasChild(hisName)){                                                                // Check request actually exists in database
               firebase.database().ref('/users/' + myName + '/friends').update(obj).then(function(){        // Add player to user's friends in database
                  firebase.database().ref('/users/' + myName + '/requests').update(obj2);                   // Remove request
                  var obj3 = {};
                  obj3[myName] = myName;
                  firebase.database().ref('/users/' + hisName + '/friends').update(obj3).then(function(){   // Add user to new friend's friends in database
                     friendElem.parent().remove();
                  });
               });
            };
         });
      };
   });
};

/**
 * denyFriend
 * Removes friend request from user's requests in database
 */
var denyFriend = function(){
   var friendElem = $(this);
   var hisName = friendElem.attr('id');              // Get name of player who made friend request
   $.when(getName()).then(function(args){            // Get user's name from chrome local storage
      if ($.isEmptyObject(args)){
         return;
      } else {
         var myName = args['tpName'];
         firebase.database().ref('/users/' + myName + '/requests').once('value', function(snapshot){
            if (snapshot.hasChild(hisName)){                                                                // Check request actually exists in database
               var obj = {};
               obj[hisName] = null;
               firebase.database().ref('/users/' + myName + '/requests').update(obj).then(function(){       // Remove request from user's requests in database
                  friendElem.parent().remove();
               });
            };
         });
      };
   });
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
   var isFriendSelected = false;
   var chatroom;

   pub.isFriendSet = function(){        // True if any friend in friends list is selected
      return isFriendSelected;
   };
   pub.getFriend = function(){          // Return selected friend's name
      return hisName;
   };
   pub.changeFriend = function(){       // Upon clicking of friend in friends list, open chat with that friend
      firebase.database().ref(chatroom).off();
      isFriendSelected = true;
      $(selected).removeClass('friendSelected');
      selected = this;
      this.className = 'friendSelected';
      hisName = $(this).text();
      $.when(getName()).then(function(args){     // Get user's name from chrome local storage
         if ($.isEmptyObject(args)){
            return;
         } else {
            $('#chatContentDiv').empty();
            chatroom = args['tpName'] > hisName ? 'chats/chat_'+hisName+'_'+args['tpName'] : 'chats/chat_'+args['tpName']+'_'+hisName;
            firebase.database().ref(chatroom).on('child_added', function(snapshot){   // Subscribe to changes in corresponding chatroom in database
               var message = snapshot.val().split(/:(.+)?/);
               if (message[0] == args['tpName']){           // If user sent message, make message sender 'me: '
                  var msg = 'me: ' + message[1];
                  $('<p/>', {
                     "class": 'userSentMsg',
                     text: msg,
                  }).appendTo('#chatContentDiv');         // Add message to chat list
               } else {                                   // Otherwise, just send message as normal
                  $('<p/>', {
                     text: snapshot.val()
                  }).appendTo('#chatContentDiv');         // Add message to chat list
               }
               var chatDiv = document.getElementById("chatContentDiv");
               chatDiv.scrollTop = chatDiv.scrollHeight;  // Auto scroll to bottom of chat
            });
         };
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
         $(userButton).attr('id', user).addClass('inlineItem butt').html('+').bind('click', user, function(event){
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

/**
 * hideMenu
 * Closes menu
 */
var hideMenu = function(){
   firebase.auth().signOut();
   $('#FriendMenu').remove();
   isMenuShown = false;
};

})();