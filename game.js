/**
 * this file is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license.php
 */

(function() {
"use strict";

/// Consts
var GRID_WIDTH = 10;
var GRID_HEIGHT = 12;
var BLOCK_SIZE = 32;
var DEFAULT_SPEED = 8;
var NUM_BLOCKS = 2;

/// Stage/Renderer + Textures
var stage = new PIXI.Stage(0xAA2222, true);
var renderer = PIXI.autoDetectRenderer(BLOCK_SIZE * 10, BLOCK_SIZE * 12);
document.getElementById("game-div").appendChild(renderer.view);

requestAnimFrame(tick);

var block_textures = [
   PIXI.Texture.fromImage("gray.png"),
   PIXI.Texture.fromImage("blue.png"),
   PIXI.Texture.fromImage("green.png"),
   PIXI.Texture.fromImage("yellow.png"),
];

var launch_funcs = [
   null,
   function(time) {return 3 - 2 * time / 40},
   function(time) {return 4 - 2 * time / 40},
   function(time) {return 2 - 1.5 * time / 40},
];

/// Board
function Board(stage, size) {
   this.rows = new Array(size);
   this.stage = stage;
   this.numFalling = 0;
   this.changed = 0;
   this.selectedBlock = null;

   for (var i = 0; i < size; i++) {
      this.rows[i] = new Row(i);
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
   block.sprite.setInteractive(true);
   block.sprite.mousedown = block.sprite.touchstart = downEvent;
   block.sprite.mouseup = block.sprite.touchend = block.sprite.mouseupoutside = block.sprite.touchendoutside = upEvent;
   block.sprite.mouseover = block.sprite.touchmove = moveEvent;

   function downEvent(data) {
      if (this.block.fallingState === Block.STATE_RESTING || this.block.fallingState === Block.STATE_LAUNCHING) {
         _board.selectedBlock = this.block;
         this.tint = 0xFFFFFF;
      }
   }
   
   function upEvent(data) {
      _board.selectedBlock = null;
      this.tint = 0x7F7F7F;
   }

   function moveEvent(data) {
      if (!_board.selectedBlock) {
         return;
      }
      if (this.block.fallingState === Block.STATE_RESTING && _board.selectedBlock.fallingState === Block.STATE_RESTING && this.block.row === _board.selectedBlock.row) {
         var thisIndex = this.block.row.blocks.indexOf(this.block);
         var selectedIndex = this.block.row.blocks.indexOf(_board.selectedBlock);
         if (selectedIndex + 1 === thisIndex || selectedIndex - 1 === thisIndex) {
            this.block.row.blocks[thisIndex] = this.block.row.blocks.splice(selectedIndex, 1, this.block.row.blocks[thisIndex])[0];
            var t = this.position.y;
            this.position.y = _board.selectedBlock.sprite.position.y;
            _board.selectedBlock.sprite.position.y = t;
            _board.changed = 1;
         }
      }
   }
};

Board.prototype.tick = function() {
   var numFalling = 0;
   var changed = this.changed;
   var i, j;
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
            if ((e.fallingState === Block.STATE_RESTING || e.fallingState === Block.STATE_LAUNCHING) && e.type !== Block.TYPE_DEAD && i < this.rows.length - 2) {
               var a = this.rows[i+1].blocks[j];
               var b = this.rows[i+2].blocks[j];
               if (a && a.speed === 0 && a.type === e.type && b && b.speed === 0 && b.type === e.type) {
                  var matching_type = e.type;
                  e.speed = launch_funcs[matching_type];
                  a.speed = launch_funcs[matching_type];
                  b.speed = launch_funcs[matching_type];
                  e.type = Block.TYPE_DEAD;
                  a.type = Block.TYPE_DEAD;
                  b.type = Block.TYPE_DEAD;
                  e.time = 0;
                  a.time = 0;
                  b.time = 0;
                  var extra = i + 3;
                  while (this.rows[extra] && this.rows[extra].blocks[j] && this.rows[extra].blocks[j].speed === 0 && this.rows[extra].blocks[j].type === matching_type) {
                     this.rows[extra].blocks[j].speed = -8;
                     this.rows[extra].blocks[j].type = Block.TYPE_DEAD;
                     this.rows[extra].blocks[j].speed = launch_funcs[matching_type];
                     this.rows[extra].blocks[j].time = 0;
                     extra++;
                  }
               }
            }
         }
      }
   }
   this.changed = 0;
};

/// Row
function Row(num) {
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
      var speed;
      if (typeof e.speed === "function") {
         var speed = -e.speed(e.time);
         e.time++;
         if (speed >= 1) {
            speed = 1;
            e.speed = 1;
         }
      } else {
         speed = e.speed;
      }
      e.sprite.position.y += speed;
      if (i === 0 && e.sprite.position.y >= BLOCK_SIZE * GRID_HEIGHT - BLOCK_SIZE) { // bottom block
         e.sprite.position.y = BLOCK_SIZE * GRID_HEIGHT - BLOCK_SIZE;
         e.speed = 0;
         e.fallingState = Block.STATE_RESTING;
         changed = 1;
      }
      if (i > 0 && e.sprite.position.y >= this.blocks[i-1].sprite.position.y - BLOCK_SIZE) {
         e.sprite.position.y = this.blocks[i-1].sprite.position.y - BLOCK_SIZE;
         e.speed = this.blocks[i-1].speed;
         e.fallingState = Block.STATE_RESTING;
         changed = 1;
      }
      if (e.fallingState === Block.STATE_FALLING) {
         numFalling++;
      }
      if (e.sprite.position.y < 0 && e.fallingState !== Block.STATE_FALLING) {
         this.blocks.splice(i, 1);
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
   this.launching = false;
   this.row = null;
   this.sprite.block = this;
}

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

/// Game
var board = new Board(stage, 10);

function getRandomInt(min, max) {
   return Math.floor(Math.random() * (max - min + 1) + min);
}

function tick() {

   requestAnimFrame(tick);
   
   if (!board.numFalling) { // new block
      var row = getRandomInt(0, 9);
      var newblock = new Block(getRandomInt(1, NUM_BLOCKS), DEFAULT_SPEED);
      board.queueBlock(newblock, row);
   }

   board.tick();

   renderer.render(stage);
}
})();
