import { $ } from './remakejs/queryjs';

import './remakejs/copy-layout';

import './remakejs/switchjs';

import { initInputEventListeners } from './remakejs/inputjs';

initInputEventListeners();

import { getDataFromRootNode } from './remakejs/outputjs';

window.getDataFromRootNode = getDataFromRootNode;







