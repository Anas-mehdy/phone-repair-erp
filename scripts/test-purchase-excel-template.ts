import assert from 'node:assert/strict';
import readXlsxFile from 'read-excel-file/node';
import {parsePurchaseTemplate, PURCHASE_TEMPLATE_HEADERS} from '../lib/purchase-excel-template';

async function main() {
  const file = 'public/templates/massar-purchase-template.xlsx';
  const blank = await readXlsxFile(file, {sheet:'البنود'});
  assert.deepEqual(blank[0], PURCHASE_TEMPLATE_HEADERS);
  assert.throws(() => parsePurchaseTemplate(blank), /فارغ/);
  const examples = await readXlsxFile(file, {sheet:'تعليمات وأمثلة'});
  const sample = parsePurchaseTemplate(examples.slice(10,13));
  assert.equal(sample[0].barcode,'0012345678901');
  assert.equal(sample[0].category,'إكسسوارات');
  assert.equal(sample[1].salePrice,'');
  assert.deepEqual(sample.flatMap(row=>row.errors),[]);
  const twenty = Array.from({length:20},(_,i)=>['صنف '+i,'000'+i,'إكسسوارات',i+1,1.234,0]);
  const parsed = parsePurchaseTemplate([PURCHASE_TEMPLATE_HEADERS,...twenty]);
  assert.equal(parsed.length,20);
  assert.equal(parsed[0].unitCost,'1.234');
  assert.equal(parsed[0].salePrice,'0');
  assert.deepEqual(parsed.flatMap(row=>row.warnings),[]);
  assert.throws(()=>parsePurchaseTemplate([['خطأ'],...twenty]), /عناوين/);
  assert.throws(()=>parsePurchaseTemplate([PURCHASE_TEMPLATE_HEADERS,...Array(301).fill(twenty[0])]),/300/);
  const twoSixtyEight = parsePurchaseTemplate([
    PURCHASE_TEMPLATE_HEADERS,
    ...Array.from({length: 268}, (_, i) => ['صنف '+i, String(865995082327623+i), '', 1, 1, '']),
  ]);
  assert.equal(twoSixtyEight.length, 268);
  assert.deepEqual(twoSixtyEight.flatMap(row => row.errors), []);
  const bad = parsePurchaseTemplate([PURCHASE_TEMPLATE_HEADERS,['اسم',123456,'',null,-2,'']]);
  assert.equal(bad[0].barcode, '123456');
  assert.equal(bad[0].errors.length, 2);
  const numeric = parsePurchaseTemplate([PURCHASE_TEMPLATE_HEADERS,
    ['هاتف', 865995082327623, 'أجهزة', 1, 0, ''],
    ['هاتف', 1234567890123456, 'أجهزة', 1, 0, ''],
    ['هاتف', '0012345678901', 'أجهزة', 1, 0, ''],
  ]);
  assert.deepEqual(numeric[0].errors, []);
  assert.equal(numeric[0].barcode, '865995082327623');
  assert.match(numeric[0].warnings.join(' '), /أصفار/);
  assert.match(numeric[1].errors.join(' '), /كنص/);
  assert.deepEqual(numeric[2].errors, []);
  assert.deepEqual(numeric[2].warnings, []);
  console.log('PASS actual XLSX template, 20 rows, leading zeros, categories, prices, invalid rows and file limits');
}
void main();
