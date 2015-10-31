'use strict';

// Substance Article
// ----------------
//
// The default Article Implementation
//
// Uses well-defined HTML exchange representation

var $ = require('substance/util/jquery');
var OO = require('substance/util/oo');
var Document = require('substance/model/Document');
var DocumentSchema = require('substance/model/DocumentSchema');
var HtmlImporter = require('substance/model/HtmlImporter');
var HtmlExporter = require('substance/model/HtmlExporter');

var defaultNodes = [
  require('substance/packages/paragraph/Paragraph'),
  require('substance/packages/heading/Heading'),
  require('substance/packages/emphasis/Emphasis'),
  require('substance/packages/strong/Strong'),
  require('substance/packages/link/Link')
];

// Default Schema
// ----------------

var defaultSchema = new DocumentSchema("stencil", "0.1.0");

defaultSchema.getDefaultTextType = function() {
  return "paragraph";
};

defaultSchema.addNodes(defaultNodes);

// Importer
// ----------------

function Importer(schema) {
  Importer.super.call(this, { schema: schema });
}

Importer.Prototype = function() {
  this.convert = function($rootEl, doc) {
    this.initialize(doc, $rootEl);
    this.convertContainer($rootEl, 'body');
    this.finish();
  };
};

OO.inherit(Importer, HtmlImporter);

// Exporter
// ----------------

function Exporter(schema) {
  Exporter.super.call(this, { schema: schema });
}

Exporter.Prototype = function() {

  this.convert = function(doc, options) {
    this.initialize(doc, options);

    var body = doc.get('body');
    var bodyNodes = this.convertContainer(body);
    var $el = $('<div>');
    $el.append(bodyNodes);
    return $el.html();
  };
};

OO.inherit(Exporter, HtmlExporter);


// Stencil Article
// ----------------

var Stencil = function(schema) {
  Document.call(this, schema || defaultSchema);
};

Stencil.Prototype = function() {

  this.initialize = function() {
    Document.prototype.initialize.apply(this, arguments);

    this.create({
      type: "container",
      id: "body",
      nodes: []
    });
  };

  this.toHtml = function() {
    return new Exporter(this.schema).convert(this);
  };

  // replaces the content by loading from the given html
  this.loadHtml = function(html) {
    // Deletes all nodes (including container node 'body')
    this.clear();

    // Disable transaction enforcement until the import is finished
    this.FORCE_TRANSACTIONS = false;

    // Recreate body container
    // TODO: find a better solution
    this.create({
      type: "container",
      id: "body",
      nodes: []
    });

    console.log('html', html);
    var $root = $(html);
    new Importer(this.schema).convert($root, this);
    // sets this.FORCE_TRANSACTIONS = true again
    this.documentDidLoad();
  };
};

OO.inherit(Stencil, Document);
Stencil.schema = defaultSchema;

Stencil.Importer = Importer;
module.exports = Stencil;