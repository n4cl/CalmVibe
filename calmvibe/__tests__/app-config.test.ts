import fs from 'fs';
import path from 'path';

describe('Expo app.json 設定', () => {
  test('AndroidパッケージIDが定義されている', () => {
    const filePath = path.resolve(__dirname, '..', 'app.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
      expo?: {
        android?: {
          package?: string;
        };
      };
    };

    expect(config.expo?.android?.package).toBe('com.n4cl.calmvibe');
  });
});
