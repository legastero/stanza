import contextTests from './contexts';
import escapingTests from './escaping';
import exportTests from './exports';
import forwardRefsTests from './forward-refs';
import htmlTests from './html';
import importTests from './imports';
import reopenTests from './reopen';
import streamTests from './streams';
import typeTests from './types';

import attributeTests from './examples/attribute';
import booleanAttributeTests from './examples/booleanAttribute';
import childAlternateLanguageRawElementTests from './examples/childAlternateLanguageRawElement';
import childAlternateLanguageTextTests from './examples/childAlternateLanguageText';
import namespacedAttributeTests from './examples/namespacedAttribute';

importTests();
exportTests();
typeTests();
forwardRefsTests();
escapingTests();
streamTests();
contextTests();
htmlTests();
reopenTests();

attributeTests();
booleanAttributeTests();
childAlternateLanguageRawElementTests();
childAlternateLanguageTextTests();
namespacedAttributeTests();
