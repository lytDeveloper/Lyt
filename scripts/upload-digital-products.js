/**
 * Digital Products Upload Script
 *
 * Purpose: Upload PDF files to Supabase Storage (digital-products bucket)
 * Usage: node scripts/upload-digital-products.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://xianrhwkdarupnvaumti.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Please set the service role key:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Files to upload
const files = [
  {
    localPath: resolve(__dirname, '../landing/file/1. pre-insights.pdf'),
    storagePath: 'products/insight-pre-business.pdf',
    productName: '예비 사업 인사이트'
  },
  {
    localPath: resolve(__dirname, '../landing/file/2. initial-insights.pdf'),
    storagePath: 'products/insight-early-business.pdf',
    productName: '초기 사업 인사이트'
  },
  {
    localPath: resolve(__dirname, '../landing/file/3. leap-insights.pdf'),
    storagePath: 'products/insight-growth-business.pdf',
    productName: '도약 사업 인사이트'
  }
];

async function uploadFile(file) {
  const { localPath, storagePath, productName } = file;

  console.log(`\n📤 Uploading: ${productName}`);
  console.log(`   Local: ${localPath}`);
  console.log(`   Storage: ${storagePath}`);

  try {
    // Read file
    const fileBuffer = readFileSync(localPath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('digital-products')
      .upload(storagePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true // Overwrite if exists
      });

    if (error) {
      throw error;
    }

    console.log(`   ✅ Success: ${data.path}`);
    return { success: true, path: data.path };

  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('=================================================');
  console.log('Digital Products Upload Script');
  console.log('=================================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Bucket: digital-products`);
  console.log(`Files to upload: ${files.length}`);

  const results = [];

  for (const file of files) {
    const result = await uploadFile(file);
    results.push({ ...file, ...result });
  }

  console.log('\n=================================================');
  console.log('Upload Summary');
  console.log('=================================================');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}/${files.length}`);
  console.log(`❌ Failed: ${failed}/${files.length}`);

  if (failed > 0) {
    console.log('\nFailed uploads:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.productName}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\n✅ All files uploaded successfully!');
  console.log('\nNext steps:');
  console.log('1. Verify files in Supabase Dashboard: Storage > digital-products');
  console.log('2. Continue with Phase 3: Edge Functions implementation');
}

main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
