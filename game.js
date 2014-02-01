/**
 * this file is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license.php
 */

var stage = new PIXI.Stage(0xAA2222);
var renderer = PIXI.autoDetectRenderer(640, 480);
document.getElementById("game-div").appendChild(renderer.view);

const START_X = 160;
const GRID_SIZE = 480;
const BLOCK_SIZE = 32;

requestAnimFrame(tick);

var block_textures = [
   PIXI.Texture.fromImage("blue.png"),
   PIXI.Texture.fromImage("green.png"),
   //PIXI.Texture.fromImage("yellow.png"),
]

/// Board
function Board(stage, size) {
   this.rows = new Array(size);
   this.stage = stage;
   this.numFalling = 0;

   for (var i = 0; i < size; i++) {
      this.rows[i] = new Row(i);
   }
}

Board.prototype.numRows = function() {
   return this.rows.length;
};

Board.prototype.queueBlock = function(block, row) {
   this.rows[row].queueBlock(block);
   this.stage.addChild(block.sprite);
};

Board.prototype.tick = function() {
   var numFalling = 0;
   for (var i = 0; i < this.rows.length; i++) {
      numFalling += this.rows[i].tick(this.stage);
   }
   this.numFalling = numFalling;
   for (var i = 0; i < this.rows.length; i++) {
      for (var j = 0; j < this.rows[i].blocks.length; j++) {
         var e = this.rows[i].blocks[j];
         // three in a row
         if (e.speed == 0 && i < this.rows.length - 2) {
            var a = this.rows[i+1].blocks[j];
            var b = this.rows[i+2].blocks[j];
            if (a && a.speed == 0 && a.type == e.type && b && b.speed == 0 && b.type == e.type) {
               e.speed = -8;
               a.speed = -8;
               b.speed = -8;
               var extra = i + 3;
               while (this.rows[extra] && this.rows[extra].blocks[j] && this.rows[extra].blocks[j].speed == 0 && this.rows[extra].blocks[j].type == e.type) {
                  this.rows[extra].blocks[j].speed = -8;
                  extra++;
               }
            }
         }
      }
   }
};

/// Row
function Row(num) {
   this.blocks = [];
   this.num = num;
}

Row.prototype.queueBlock = function(block) {
   block.sprite.position.x = START_X + this.num * 32;
   block.sprite.position.y = 0;
   this.blocks.push(block);
};

Row.prototype.tick = function(stage) {
   var numFalling = 0;
   for (var i = 0; i < this.blocks.length; i++) {
      var e = this.blocks[i];
      e.sprite.position.y += e.speed;
      if (i == 0 && e.sprite.position.y >= GRID_SIZE - BLOCK_SIZE) { // bottom block
         e.sprite.position.y = GRID_SIZE - BLOCK_SIZE;
         e.speed = 0;
         e.falling = false;
      }
      if (i > 0 && e.sprite.position.y >= this.blocks[i-1].sprite.position.y - BLOCK_SIZE) {
         e.sprite.position.y = this.blocks[i-1].sprite.position.y - BLOCK_SIZE;
         e.speed = this.blocks[i-1].speed;
         e.falling = false;
      }
      if (e.falling) {
         numFalling++;
      }
      if (e.sprite.position.y < 0 && e.speed < 0) {
         this.blocks.splice(i, 1);
         stage.removeChild(e.sprite);
         i--;
      }
   }
   return numFalling;
};

/// Block
function Block(type, speed, falling) {
   this.type = type;
   this.speed = speed;
   this.falling = falling;
   this.launching = false;
   this.sprite = new PIXI.Sprite(block_textures[type]);
}

var board = new Board(stage, 10);

function getRandomInt(min, max) {
   return Math.floor(Math.random() * (max - min + 1) + min);
}

function tick() {

   requestAnimFrame(tick);
   
   if (!board.numFalling) { // new block
      var row = getRandomInt(0, 9);
      falling = new Block(getRandomInt(0, block_textures.length - 1), 8, true);
      board.queueBlock(falling, row);
   }

   board.tick();

   renderer.render(stage);
}
