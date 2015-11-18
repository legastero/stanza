include node_modules/make-better/core.inc

NAME = stanzaio
STANDALONE = XMPP
MAIN = index.js

LIB = $(call find_recursive,lib,*.js)


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

# -- Build artifacts --------------------------------------------------

build/$(NAME).zip: build/$(NAME).bundle.js build/$(NAME).bundle.min.js
	zip -j $@ $^

build/$(NAME).bundle.js: $(MAIN) $(LIB)
	mkdir -p build
	browserify --full-paths --standalone $(STANDALONE) $(MAIN) > $@

build/$(NAME).bundle.min.js: build/$(NAME).bundle.js
	uglifyjs --screw-ie8 --compress --mangle --keep-fnames build/$(NAME).bundle.js > $@
