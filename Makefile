NAME = stanzaio
STANDALONE = XMPP
MAIN = index.js

SHELL = /bin/bash
PATH := ./node_modules/.bin:$(PATH)
LIB = $(shell find lib -name '*.js')
BIN = ./node_modules/.bin


# -- Tasks ------------------------------------------------------------

.PHONY: all lint test audit clean

all: test build audit

build: lint build/$(NAME).zip

clean:
	rm -rf build

test: lint
	node test/index.js | tap-spec

lint:
	jshint .

audit:
	nsp package


# -- Build artifacts --------------------------------------------------

build/$(NAME).zip: build/$(NAME).bundle.js build/$(NAME).bundle.min.js
	zip -j $@ $^

build/$(NAME).bundle.js: $(MAIN) $(LIB)
	mkdir -p build
	browserify --standalone $(STANDALONE) $(MAIN) > $@

build/$(NAME).bundle.min.js: build/$(NAME).bundle.js
	uglifyjs --screw-ie8 build/$(NAME).bundle.js > $@
