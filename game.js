/**
 * this file is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license.php
 */

(function() {
"use strict";

/// Config
var GRID_WIDTH = 10;
var GRID_HEIGHT = 12;
var BLOCK_SIZE = 32;
var DEFAULT_SPEED = 8;
var NUM_BLOCKS = 5;

/// Utils
function getRandomInt(min, max) {
   return Math.floor(Math.random() * (max - min + 1) + min);
}

/// Stage/Renderer + Textures
var stage = new PIXI.Stage(0xCCCCCC, true);
var renderer = PIXI.autoDetectRenderer(BLOCK_SIZE * 10, BLOCK_SIZE * 12);
document.getElementById("game-div").appendChild(renderer.view);

requestAnimFrame(tick);

var block_textures = [
   PIXI.Texture.fromImage("gray.png"),
   PIXI.Texture.fromImage("blue.png"),
   PIXI.Texture.fromImage("green.png"),
   PIXI.Texture.fromImage("yellow.png"),
   PIXI.Texture.fromImage("red.png"),
   PIXI.Texture.fromImage("purple.png"),
];

var launch_funcs = [
   null,
   function(time) {return 3 - 2 * time / 40;},
   function(time) {return 4 - 2 * time / 40;},
   function(time) {return 2 - 1.5 * time / 40;},
   function(time) {return 2 - time / 40;},
   function(time) {return 7 - 3 * time / 40;},
];

/// Board
function Board(stage, width, height) {
   this.rows = new Array(width);
   this.launchGroups = [];
   this.height = height;
   this.stage = stage;
   this.numFalling = 0;
   this.totalLaunched = 0;
   this.changed = 0;
   this.selectedBlock = null;

   var starter_launch = new LaunchGroup(function() { return -(GRID_HEIGHT + 1) * BLOCK_SIZE; });
   starter_launch.timeToLive = 100;
   this.launchGroups.push(starter_launch);

   for (var i = 0; i < width; i++) {
      this.rows[i] = new Row(this, i);
      for (var j = 0; j < 3; j++) {
         var b = new Block(0, (GRID_HEIGHT + 1) * BLOCK_SIZE);
         this.queueBlock(b, i);
         starter_launch.addBlock(b);
      }
   }
}

Board.prototype.numRows = function() {
   return this.rows.length;
};

Board.prototype.queueBlock = function(block, row) {
   var _board = this;
   this.rows[row].queueBlock(block);
   this.stage.addChild(block.sprite);
   block.sprite.tint = 0x7F7F7F;
   block.sprite.interactive = true;
   block.sprite.mousedown = block.sprite.touchstart = downEvent;
   block.sprite.mouseup = block.sprite.touchend = block.sprite.mouseupoutside = block.sprite.touchendoutside = upEvent;
   block.sprite.mouseover = block.sprite.touchmove = moveEvent;

   function downEvent(data) {
      var target = data.target;
      if (target.block.fallingState === Block.STATE_RESTING || target.block.fallingState === Block.STATE_LAUNCHING) {
         _board.selectedBlock = target.block;
         //target.tint = 0xFFFFFF;
      }
   }
   
   function upEvent(data) {
      var target = data.target;
      _board.selectedBlock = null;
      //target.tint = 0x7F7F7F;
   }

   function moveEvent(data) {
      var target = data.target;
      if (!_board.selectedBlock || _board.changed || target.block.row !== _board.selectedBlock.row) {
         return;
      }
      if (target.block.fallingState === Block.STATE_RESTING && _board.selectedBlock.fallingState === Block.STATE_RESTING && target.block.launchGroup === _board.selectedBlock.launchGroup) {
         var thisIndex = target.block.row.blocks.indexOf(target.block);
         var selectedIndex = target.block.row.blocks.indexOf(_board.selectedBlock);
         if (selectedIndex + 1 === thisIndex || selectedIndex - 1 === thisIndex) {
            target.block.row.blocks[thisIndex] = target.block.row.blocks.splice(selectedIndex, 1, target.block.row.blocks[thisIndex])[0];
            var y = target.position.y;
            var group = target.block.launchGroup;
            target.position.y = _board.selectedBlock.sprite.position.y;
            target.block.launchGroup = _board.selectedBlock.launchGroup;
            _board.selectedBlock.sprite.position.y = y;
            _board.selectedBlock.launchGroup = group;
            _board.changed = 1;
         }
      }
      else if (target.block.fallingState === Block.STATE_LAUNCHING && _board.selectedBlock.fallingState === Block.STATE_LAUNCHING && target.block.row === _board.selectedBlock.row) {
         
      }
   }
};

Board.prototype.tick = function() {
   var ROW = 1;
   var COL = 2;
   var numFalling = 0;
   var changed = this.changed;
   var i = -1, j;
   while (++i < this.launchGroups.length) {
      // group is done, remove it
      if (!this.launchGroups[i].tick()) {
         this.launchGroups.splice(i--, 1);
      }
   }
   for (i = 0; i < this.rows.length; i++) {
      var r = this.rows[i].tick(this.stage);
      numFalling += r[0];
      changed += r[1];
   }
   this.numFalling = numFalling;
   // only recalc if there is a change
   if (changed) {
      for (i = 0; i < this.rows.length; i++) {
         for (j = 0; j < this.rows[i].blocks.length; j++) {
            var e = this.rows[i].blocks[j];
            // three in a row
            if ((e.fallingState === Block.STATE_RESTING || e.fallingState === Block.STATE_LAUNCHING) && e.type !== Block.TYPE_DEAD) {
               var a = null;
               var b = null;
               var direction = 0;
               if (i < this.rows.length - 2) {
                  a = this.rows[i+1].blocks[j];
                  b = this.rows[i+2].blocks[j];
                  direction = ROW;
               }
               if (!a || a.type !== e.type || !b || b.type !== e.type) {
                  a = this.rows[i].blocks[j+1];
                  b = this.rows[i].blocks[j+2];
                  direction = COL;
               }
               if (direction && a && a.type === e.type && b && b.type === e.type && a.fallingState === e.fallingState && b.fallingState === e.fallingState && (e.fallingState === Block.STATE_RESTING || (a.launchGroup === e.launchGroup && b.launchGroup === e.launchGroup))) {
                  var matching_type = e.type;
                  var matching_group = e.launchGroup;
                  var matching_state = e.fallingState
                  var launchGroup = new LaunchGroup(launch_funcs[matching_type]);
                  this.launchGroups.push(launchGroup);
                  launch(e, matching_type, launchGroup);
                  launch(a, matching_type, launchGroup);
                  launch(b, matching_type, launchGroup);
                  if (direction === ROW) {
                     var extra = i + 3;
                     while (this.rows[extra] && this.rows[extra].blocks[j] && this.rows[extra].blocks[j].type === matching_type && this.rows[extra].blocks[j].fallingState === matching_state && (matching_state === Block.STATE_RESTING || this.rows[extra].blocks[j].launchGroup === matching_group)) {
                        launch(this.rows[extra].blocks[j], matching_type, launchGroup);
                        extra++;
                     }
                  } else {
                     var extra = j + 3;
                     while (this.rows[i].blocks[extra] && this.rows[i].blocks[extra].type === matching_type && this.rows[i].blocks[extra].fallingState === matching_state && (matching_state === Block.STATE_RESTING || this.rows[i].blocks[extra].launchGroup === matching_group)) {
                        launch(this.rows[i].blocks[extra], matching_type, launchGroup);
                        extra++;
                     }
                  }
               }
            }
         }
      }
      this.changed = 0;
   }

   function launch(x, type, launchGroup) {
      x.type = Block.TYPE_DEAD;
      launchGroup.addBlock(x);
   }
};

/// Row
function Row(board, num) {
   this.board = board;
   this.blocks = [];
   this.num = num;
}

Row.prototype.queueBlock = function(block) {
   block.sprite.position.x = this.num * BLOCK_SIZE;
   block.sprite.position.y = -block.sprite.height;
   block.row = this;
   this.blocks.push(block);
};

Row.prototype.tick = function(stage) {
   var numFalling = 0;
   var changed = 0;
   for (var i = 0; i < this.blocks.length; i++) {
      var e = this.blocks[i];
      e.time++;
      var speed;
      var speed_func = e.launchGroup ? e.launchGroup.speed : e.speed;
      var time = e.launchGroup ? e.launchGroup.time : e.time;
      // launch speeds are functions, invert them to deal with upper-right origin
      if (typeof speed_func === "function") {
         speed = -speed_func(time);
      } else {
         speed = speed_func;
      }
      e.sprite.position.y += speed;
      // bottom block hits the bottom of the board
      if (i === 0 && e.sprite.position.y >= BLOCK_SIZE * this.board.height - BLOCK_SIZE) {
         e.sprite.position.y = BLOCK_SIZE * this.board.height - BLOCK_SIZE;
         e.speed = 0;
         e.fallingState = Block.STATE_RESTING;
         changed = 1;
      }
      // block hits another block
      if (i > 0 && e.sprite.position.y >= this.blocks[i-1].sprite.position.y - BLOCK_SIZE) {
         e.sprite.position.y = this.blocks[i-1].sprite.position.y - BLOCK_SIZE;
         e.speed = this.blocks[i-1].speed;
         e.time = this.blocks[i-1].time;
         e.fallingState = this.blocks[i-1].fallingState;
         if (this.blocks[i-1].fallingState === Block.STATE_LAUNCHING && this.blocks[i-1].launchGroup) {
            this.blocks[i-1].launchGroup.addBlock(e);
         }
         changed = 1;
      }
      // block is freefalling
      if (e.fallingState === Block.STATE_FALLING) {
         numFalling++;
      }
      // block is launched off the top of the board
      if (e.sprite.position.y < 0 && e.fallingState !== Block.STATE_FALLING) {
         this.blocks.splice(i, 1);
         this.board.totalLaunched++;
         if (e.launchGroup) {
            e.launchGroup.removeBlock(e);
         }
         stage.removeChild(e.sprite);
         i--;
      }
   }
   return [numFalling, changed];
};

/// Block
function Block(type, speed) {
   this.sprite = new PIXI.Sprite(block_textures[type]);
   this.sprite.width = this.sprite.height = BLOCK_SIZE;
   this.type = type;
   this.speed = speed;
   this.time = 0;
   this.fallingState = Block.STATE_FALLING;
   this.launchGroup = null;
   this.row = null;
   this.sprite.block = this;
}

Block.prototype.revive = function() {
   var row = this.row;
   var board = row.board;
   var blockOffset = row.blocks.indexOf(this);
   // range of all blocks
   var valid_ids = Array.apply(null, new Array(NUM_BLOCKS)).map(function (_, i) {return i + 1;});
   var bad_ids = [];
   if (board.rows[row.num-1] && board.rows[row.num-1].blocks[blockOffset]) {
      bad_ids.push(board.rows[row.num-1].blocks[blockOffset].type);
   }
   if (board.rows[row.num+1] && board.rows[row.num+1].blocks[blockOffset]) {
      bad_ids.push(board.rows[row.num+1].blocks[blockOffset].type);
   }
   if (board.rows[row.num].blocks[blockOffset+1]) {
      bad_ids.push(board.rows[row.num].blocks[blockOffset+1].type);
   }
   if (board.rows[row.num].blocks[blockOffset-1]) {
      bad_ids.push(board.rows[row.num].blocks[blockOffset-1].type);
   }
   valid_ids = valid_ids.filter(function(x) {return bad_ids.indexOf(x) === -1;});
   this.type = valid_ids[getRandomInt(0, valid_ids.length - 1)];
};

Object.defineProperty(Block.prototype, 'type', {
   get: function() {
      return this._type;
   },
   set: function(value) {
      this.sprite.setTexture(block_textures[value]);
      this._type = value;
   }
});

Block.TYPE_DEAD = 0;

Block.STATE_FALLING = 1;
Block.STATE_LAUNCHING = 2;
Block.STATE_RESTING = 3;

/// LaunchGroup
function LaunchGroup(speed) {
   this.blocks = [];
   this.speed = speed;
   this.time = 0;
   this.timeToLive = 0;
}

LaunchGroup.prototype.tick = function() {
   // group is empty (was combined with another or completely launched), remove it
   if (this.blocks.length === 0) {
      return false;
   }
   // Reset timer after landing
   if (this.blocks[0].fallingState === Block.STATE_RESTING) {
      this.timeToLive++;
      if (this.timeToLive > 100) {
         while (this.blocks.length) {
            var block = this.blocks.pop();
            block.launchGroup = null;
            block.sprite.tint = 0x7F7F7F;
            if (block.type === Block.TYPE_DEAD) {
               block.revive();
            }
         }
         return false;
      }
   } else {
      this.time++;
      this.timeToLive = 0;
   }
   return true;
};

LaunchGroup.prototype.addBlock = function(block) {
   var _ = this;
   if (block.launchGroup !== this) {
      // if already a part of a group, combine them
      if (block.launchGroup) {
         var oldGroupBlocks = block.launchGroup.blocks;
         while (oldGroupBlocks.length) {
            add(oldGroupBlocks.pop());
         }
      } else {
         add(block);
         for (var i = block.row.blocks.indexOf(block) + 1; block.row.blocks[i] && (block.row.blocks[i].fallingState === Block.STATE_RESTING || (block.row.blocks[i].fallingState === Block.STATE_LAUNCHING && block.row.blocks[i].launchGroup === this)); i++) {
            add(block.row.blocks[i]);
         }
      }
   }
   
   function add(x) {
      x.launchGroup = _;
      x.fallingState = Block.STATE_LAUNCHING;
      x.sprite.tint = 0xFFFFFF;
      _.blocks.push(x);
   }
};

LaunchGroup.prototype.removeBlock = function(block) {
   this.blocks.splice(this.blocks.indexOf(block), 1);
};

/// Game
var board = new Board(stage, GRID_WIDTH, GRID_HEIGHT);
var drop_cooldown = 0;

function tick() {

   requestAnimFrame(tick);
   
   if (!board.numFalling) { // new block
      if (++drop_cooldown > 60 - board.totalLaunched / 10) {
         var row = getRandomInt(0, GRID_WIDTH - 1);
         var newblock = new Block(getRandomInt(1, NUM_BLOCKS), DEFAULT_SPEED);
         board.queueBlock(newblock, row);
      }
   } else {
      drop_cooldown = 0;
   }

   board.tick();

   renderer.render(stage);
}
})();
