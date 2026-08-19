'use strict';
// Yeni mini oyun eklemek icin: bu klasore bir dosya yaz ve asagiya ekle.
// Ayrica public/js/minigames/ altina cizimini yaz ve public/index.html'e <script> satirini ekle.
module.exports = [
  require('./race'),
  require('./reflex'),
  require('./dodge'),
  require('./memory'),
  require('./mole'),
  require('./hotpotato'),
  require('./filedelete'),
  require('./wirecut'),
  require('./shapesort'),
  require('./puzzle'),
];
