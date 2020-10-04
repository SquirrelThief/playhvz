// Copyright 2017 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// TODO: High-level file comment.

'use strict';

class FakeBridge {
  constructor(idGenerator, alertHandler) {
    this.databaseOperations = [];
    this.alertHandler = alertHandler;
    this.simpleWriter = new SimpleWriter(null)
    this.teeWriter = new TeeWriter(this.simpleWriter);
    var fakeServer = new FakeServer(idGenerator, this.teeWriter, new Date().getTime());
    var checkedServer = new CheckedServer(idGenerator, fakeServer, Bridge.METHODS_MAP);
    var cloningFakeSerer = new CloningWrapper(checkedServer, Bridge.METHODS);
    var delayingCloningFakeServer = new DelayingWrapper(cloningFakeSerer, Bridge.METHODS);
    this.server = fakeServer;

    window.fakeBridge = this;

    this.currentUserId = null
  }

  signIn({ userId }) {
    assert(userId);
    this.currentUserId = userId;
    this.server.register({ userId: userId });
    return userId;
  }

  signOut() {
    this.currentUserId = null
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 0);
    });
  }

  getSignedInPromise() {
    assert(this.currentUserId)
    return new Promise((resolve, reject) => {
      this.server.register({ userId: this.currentUserId })
      resolve({ userId: this.currentUserId, email: "emailhere@somewebsite.lol" })
    });
  }

  /* listenToGame(userId, gameId, destination) {
     var gatedWriter = new GatedWriter(new MappingWriter(destination), false);
     var cloningWriter = new CloningWriter(gatedWriter);
     cloningWriter.batchedWrite([
       {
         type: 'set',
         path: [],
         value: Utils.copyOf(this.simpleWriter.destination),
       },
     ]);
     this.teeWriter.addDestination(cloningWriter);
 
     var interval =
       setInterval(() => {
         gatedWriter.openGate();
         gatedWriter.closeGate();
       }, 100);
 
     let foundGamePromise = new Promise((resolve, reject) => {
       setTimeout(() => {
         resolve();
       }, 1000);
     });
     let finishedLoadingGamePromise = new Promise((resolve, reject) => {
       setTimeout(() => {
         resolve();
       }, 2000);
     });
     return [foundGamePromise, finishedLoadingGamePromise];
   } */
  register(args) {
    let { userId } = args;
    this.currentUserId = userId
    this.server.register(args)
    return userId;
  }

  createGame(args) {
    this.server.createGame(args)
  }

  getGameList(userId) {
    return new Promise((resolve, reject) => {
      resolve(this.server.getGameList(userId))
    });
  }

  listenToGame(gameId, callback) {
    callback(this.server.getGame(gameId));
  }

  joinGame(gameName, playerName) {
    return this.server.joinGame(this.currentUserId, gameName, playerName);
  }

  getPlayer(userId, gameId) {
    return new Promise((resolve, reject) => {
      resolve(this.server.getPlayer(userId, gameId));
    });
  }

  listenToPlayer(gameId, playerId, callback) {
    callback(playerId, this.server.listenToPlayer(gameId, playerId));
  }

  changePlayerAllegiance(gameId, playerId, newAllegiance) {
    return new Promise((resolve, reject) => {
      resolve(this.server.changePlayerAllegiance(gameId, playerId, newAllegiance));
    });
  }

  listenToChatRoom(gameId, chatRoomId) {
    return new Promise((resolve, reject) => {
      resolve(this.server.listenToChatRoom(gameId, chatRoomId));
    });
  }

  listenToGroup(gameId, groupId) {
    return new Promise((resolve, reject) => {
      resolve(this.server.listenToGroup(gameId, groupId));
    });
  }

  listenToChatRoomMessages(gameId, chatRoomId) {
    return new Promise((resolve, reject) => {
      resolve(this.server.listenToChatRoomMessages(gameId, chatRoomId));
    });
  }

  sendChatMessage(gameId, messageId, chatRoomId, playerId, message) {
    return new Promise((resolve, reject) => {
      resolve(this.server.sendChatMessage(gameId, messageId, chatRoomId, playerId, message));
    });
  }


}

function CloningWrapper(inner, funcNames) {
  for (const funcName of funcNames) {
    this[funcName] = function (...args) {
      // console.log('Calling', funcName, 'with args', ...args);
      return Utils.copyOf(inner[funcName](...args.map(Utils.copyOf)));
    }
  }
}

function DelayingWrapper(inner, funcNames) {
  let delay = Utils.getParameterByName('fakeServerDelay', 100);
  let synchronous = delay == 'synchronous';

  for (const funcName of funcNames) {
    this[funcName] = function (...args) {
      // console.log('Making request', funcName, ...args);
      return new Promise((resolve, reject) => {
        let execute = () => {
          try {
            //console.log('Recipient received request', funcName, ...args);
            const result = inner[funcName](...args);
            //console.log('Recipient responding with', result);
            if (synchronous)
              resolve(result);
            else
              setTimeout(() => resolve(result), delay);

          } catch (error) {
            console.log('Error doing request', funcName, ...args);
            console.error(error);

            if (synchronous)
              reject(error);
            else
              setTimeout(() => reject(error), delay);
          }
        };

        if (synchronous)
          execute();
        else
          setTimeout(execute, delay);
      });
    };
  }
}
