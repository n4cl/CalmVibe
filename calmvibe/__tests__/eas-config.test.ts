import fs from 'fs';
import path from 'path';

describe('EAS Build設定', () => {
  test('APK向けのビルドプロファイルが定義されている', () => {
    const filePath = path.resolve(__dirname, '..', 'eas.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      build?: {
        preview?: {
          android?: {
            buildType?: string;
          };
          distribution?: string;
        };
      };
    };

    expect(config.build?.preview).toBeTruthy();
    expect(config.build?.preview?.android?.buildType).toBe('apk');
    expect(config.build?.preview?.distribution).toBe('internal');
  });
});
