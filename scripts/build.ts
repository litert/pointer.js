import { execSync } from 'node:child_process';
import { rollup } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

async function build(): Promise<void> {
    // --- 生成声明文件 ---
    execSync('npx tsc -p tsconfig.build.json', { 'stdio': 'inherit' });

    // --- ESM 格式 ---
    const esmBundle = await rollup({
        'input': 'src/index.ts',
        'plugins': [
            typescript({
                'tsconfig': './tsconfig.json',
                'noEmit': false,
                'declaration': false
            })
        ]
    });
    await esmBundle.write({
        'file': 'dist/index.esm.js',
        'format': 'esm',
        'sourcemap': false
    });
    await esmBundle.close();

    // --- UMD 格式（压缩版，浏览器用） ---
    const umdBundle = await rollup({
        'input': 'src/index.ts',
        'plugins': [
            typescript({
                'tsconfig': './tsconfig.json',
                'noEmit': false,
                'declaration': false
            }),
            terser()
        ]
    });
    await umdBundle.write({
        'file': 'dist/index.umd.min.js',
        'format': 'umd',
        'name': 'pointer',
        'sourcemap': false
    });
    await umdBundle.close();

    // --- UMD 格式（未压缩版） ---
    const umdDevBundle = await rollup({
        'input': 'src/index.ts',
        'plugins': [
            typescript({
                'tsconfig': './tsconfig.json',
                'noEmit': false,
                'declaration': false
            })
        ]
    });
    await umdDevBundle.write({
        'file': 'dist/index.umd.js',
        'format': 'umd',
        'name': 'pointer',
        'sourcemap': false
    });
    await umdDevBundle.close();

    console.log('Build completed!');
}

build().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
