import test from 'node:test';
import assert from 'node:assert/strict';
import {profilePatch} from '../src/lib/profile-data.ts';
test('language patch validates locales and preserves medical and allergy data',()=>{for(const language of ['en','hi','es']){const result=profilePatch({allergies:['Milk'],medical:['Diabetes']},'language',{language});assert.equal(result.preferences.language,language);assert.deepEqual(result.preferences.allergies,['Milk']);assert.deepEqual(result.preferences.medical,['Diabetes']);}assert.throws(()=>profilePatch({},'language',{language:'unsupported'}),/supported language/);});
