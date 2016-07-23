/**
 *  TagProFriends.js
 *  Friends list feature for TagPro 
 */

(function  () {
   
var isMenuShown = false;

/**
 * addHomeButton
 * Adds FRIENDS button on main page, adds new user to database
 */
var addHomeButton = function(){
   $.when(getName()).then(function(args){ 
      if ($.isEmptyObject(args)){                                                   // New user
         if (document.getElementById('profile-btn')){                               // If user is logged in, get their name from profile page
            $.get('http://tagpro-origin.koalabeast.com'+$("#profile-btn").attr("href"), function(err,response,data){ 
               var name = $(data.responseText).find(".profile-name").text().trim(); // Extract name from profile page html
               firebase.database().ref('/users').once('value', function(snapshot){
                  if (!snapshot.hasChild(name)){                                    // Check name isn't already in database
                     chrome.storage.local.set({'name':name}, function(){            // Set name in chrome local storage        
                        var dbRef = firebase.database().ref('users');
                        var obj = {};
                        obj[name] = {'friends':'none', 'requests':'none'};
                        dbRef.update(obj);                                          // Add new user to database
                     });
                  }; 
               });           
            });
         };
      };
   });
   var button = document.createElement('li');
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
      $(menu).append(headingDiv).hide().appendTo(document.body).fadeIn(200);
      
      getInfo();
   };
};

/**
 * getInfo
 * Gets locally stored player name, if null calls enterName, otherwise calls makeFriends & makeChat
 */
var getInfo = function(){
   $.when(getName()).then(function(args){     // Waits until Chrome local storage retrieves stored name
      if ($.isEmptyObject(args)){
         return;                              // Name not set
      } else {
         makeFriends(args['name']);           // Otherwise, start adding different features
         makeChat();
      }
   });
};

/**
 * makeFriends
 * @param  {user's name}
 * Creates friends list & add friend divs, then calls makeRequests to make friend request div
 */
var makeFriends = function(data){
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
   firebase.database().ref('/users/' + data).once('value').then(function(snapshot) {  // Get user's data from database
      appendFriends(snapshot.val()['friends']);       // Add user's friends to friends list
      makeRequests(snapshot.val()['requests']);       // Start building friend requests module
   });
};

/**
 * appendFriends
 * @param  {list of user's friends}
 * Populates friends list with user's friends
 */
var appendFriends = function(friends){
   if (friends === 'none'){       // User has no friends added yet
      $('<p/>', {
         id: 'defaultFriend',
         addClass: 'friendItem',
         text: 'Add some friends!'
      }).appendTo(document.getElementById('friendsList'));
   } else {                       // User has friends, add them to friends list
      for (friend in friends){
         $('<p/>', {
            addClass: 'friendItem',
            text: friend
         }).appendTo(document.getElementById('friendsList')).bind('click', friendSelected.changeFriend);
      }
   }
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
      if (which.keyCode == 13){ sendMessage($(this).val());}     
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
   var hisName = friendSelected.getFriend();                   // Get selected friend's name
   $.when(getName()).then(function(args){                      // Retrieve user's name from local storage
      if ($.isEmptyObject(args)){
         return;
      } else {
         var chatroom = args['name'] > hisName ? 'chats/chat_'+hisName+'_'+args['name'] : 'chats/chat_'+args['name']+'_'+hisName;
         firebase.database().ref(chatroom).push(args['name'] + msg);          // Push message to user's and friends chat in database
      }
   });
}

/**
 * makeRequests
 * @param  {list of friend requests}
 * Makes and populates friend request div
 */
var makeRequests = function(requests){
   var requestsList = document.createElement('div');           // Main wrapper div for friend requests module
   var requestHead = document.createElement('div');            // Header div
   requestHead.id = 'requestHeadDiv';
   requestsList.id = 'requestsList';
   var requestDiv = document.createElement('div');             // Content div
   var requestPrompt = document.createElement('h3');           // Header text
   $(requestPrompt).text('friend requests').css({'margin-bottom':'0', 'transform':'translateY(40%)'}).appendTo(requestHead);
   if (requests === 'none'){                                   // If no friend requests, do nothing
   } else {                                                    // Otherwise, populate requests list
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

/**
 * requestFriend
 * Adds user's name to targeted player's requests in database
 */
var requestFriend = function(){
   var reqName = $('#addFriendText').val();                                  // Get player's name to make friend request to
   if (reqName.length > 0 && reqName.length < 13){
      firebase.database().ref('/users/').once('value', function(snapshot){   // Check requested player is in database
         if (snapshot.hasChild(reqName)){
            $.when(getName()).then(function(args){                           // Retrive user's name from chrome local storage
               if (reqName !== args['name']){                                // User not trying to add himself
                  var obj = {};
                  obj[args['name']] = true;
                  firebase.database().ref('/users/' + reqName + '/requests').update(obj);   // Add user's name to player's friend requests in database
               }
            });
         } else {                                                            // Requested player is not in databse  
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
         var myName = args['name'];
         var obj = {};
         obj[hisName] = true;
         var obj2 = {};
         obj2[hisName] = null;
         firebase.database().ref('/users/' + myName + '/requests').once('value', function(snapshot){
            if (snapshot.hasChild(hisName)){                                                                // Check request actually exists in database
               firebase.database().ref('/users/' + myName + '/friends').update(obj).then(function(){        // Add player to user's friends in database
                  firebase.database().ref('/users/' + myName + '/requests').update(obj2);                   // Remove request
                  var obj3 = {};
                  obj3[myName] = true;
                  firebase.database().ref('/users/' + hisName + '/friends').update(obj3).then(function(){   // Add user to new friend's friends in database
                     friendElem.parent().remove();
                     $('#defaultFriend').remove();
                     $('<p/>', {                      // Appends new friend to friends list
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
         var myName = args['name'];
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
 * enterName
 * Creates div for new players to enter their name
 */
var enterName = function(){
   var nameDiv = document.createElement('div');                   // Wrapper div
   nameDiv.id = 'nameDiv';
   var prompt = document.createElement('h1');                     // Prompt text
   $(prompt).text('Enter your TagPro name').attr('id','namePrompt');
   var nameField = document.createElement('input');               // Input for typing name
   $(nameField).attr({'id':'nameField', 'type':'text'});
   var nameButton = document.createElement('button');             // Button for setting name
   $(nameButton).attr('id', 'nameButton').html('Start').bind('click', setName).addClass('butt');
   $(nameDiv).append(prompt, nameField, nameButton);
   $('#FriendMenu').append(nameDiv);
};

/**
 * getName
 * Gets locally stored user's name
 */
var getName = function(){
   var p = $.Deferred();
   chrome.storage.local.get('name', function(data){         // Get user's locally stored name from chrome storage
      p.resolve(data);
   });
   return p.promise();
};

/**
 * setName
 * Sets name for new player, adds section users in database
 */
var setName = function(){
   var name = $('#nameField').val();                                       // Get typed in name of new player
   if (name.length > 0 && name.length < 13){
      firebase.database().ref('/users').once('value', function(snapshot){  
         if (!snapshot.hasChild(name)){                                    // Check name isn't already in database
            chrome.storage.local.set({'name':name}, function(){            // Set name in chrome local storage        
               var dbRef = firebase.database().ref('users');
               var obj = {};
               obj[name] = {'friends':'none', 'requests':'none'};
               dbRef.update(obj).then(function(){                          // Add name to database
                  $('#nameDiv').remove();
                  getInfo();                                               // Start building menu modules
               });
            });
         } else {                                                          // Name already in database, alert user
            alert('Name already exists');
         }
      });
   }
};

/**
 * friendSelected
 * Upon pressing friend in friends list, opens and retrieves chatroom with targeted player
 */
var friendSelected = (function(){
   var selected;                        // Selected friend element in friends list
   var pub = {};
   var hisName;                         // Hold selected friend's name
   var isFriendSelected = false;
   pub.isFriendSet = function(){        // True if any friend in friends list is selected
      return isFriendSelected;
   };
   pub.getFriend = function(){          // Return selected friend's name
      return hisName;
   };
   pub.changeFriend = function(){       // Upon clicking of friend in friends list, open chat with that friend
      isFriendSelected = true;
      $(selected).removeClass('friendSelected');
      selected = this;
      this.className = 'friendSelected';
      hisName = $(this).text();
      $.when(getName()).then(function(args){     // Get user's name from chrome local storage
         if ($.isEmptyObject(args)){
            return;
         } else {
            var chatroom = args['name'] > hisName ? 'chats/chat_'+hisName+'_'+args['name'] : 'chats/chat_'+args['name']+'_'+hisName;
            firebase.database().ref(chatroom).on('child_added', function(snapshot){   // Subscribe to changes in corresponding chatroom in databse
               $('<p/>', {
                  text: snapshot.val()
               }).appendTo('#chatContentDiv');         // Add message to chat list
            });
         };
      });
   };
   return pub;
}());

/**
 * hideMenu
 * Closes menu
 */
var hideMenu = function(){
   chrome.storage.local.clear(function() {
      var error = chrome.runtime.lastError;
      if (error) {
         console.error(error);
      }
   });
   $('#FriendMenu').remove();
   isMenuShown = false;
};

/**
 * Adds home button to matched URL's in manifest.json
 */
addHomeButton();


})();