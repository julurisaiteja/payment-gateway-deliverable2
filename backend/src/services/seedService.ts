import { AppDataSource } from '../config/ormconfig';
import { Merchant } from '../models/Merchant';

export async function seedTestMerchant() {
  const repo = AppDataSource.getRepository(Merchant);

  let merchant = await repo.findOne({ where: { email: 'test@example.com' } });

  if (!merchant) {
    merchant = repo.create({
      name: 'Test Merchant',               // add this line
      email: 'test@example.com',
      api_key: 'key_test_abc123',
      api_secret: 'secret_test_xyz789',
      webhook_url: null,
      webhook_secret: null
    });
    await repo.save(merchant);
  }
}
