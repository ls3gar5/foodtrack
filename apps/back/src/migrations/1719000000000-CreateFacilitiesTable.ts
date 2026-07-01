import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateFacilitiesTable1719000000000 implements MigrationInterface {
  name = 'CreateFacilitiesTable1719000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`)

    await queryRunner.query(`
      CREATE TABLE facilities (
        permit_id VARCHAR(50) PRIMARY KEY,
        applicant VARCHAR(255) NOT NULL,
        facility_type VARCHAR(50) NOT NULL,
        address VARCHAR(255) NOT NULL,
        food_items TEXT,
        location GEOGRAPHY(Point, 4326) NOT NULL,
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        permit_status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)

    await queryRunner.query(
      `CREATE INDEX idx_facilities_location ON facilities USING GIST (location)`,
    )

    await queryRunner.query(
      `CREATE INDEX idx_facilities_permit_status ON facilities (permit_status)`,
    )

    await queryRunner.query(
      `CREATE INDEX idx_facilities_facility_type ON facilities (facility_type)`,
    )

    await queryRunner.query(
      `CREATE INDEX idx_facilities_food_items ON facilities USING GIN (to_tsvector('english', food_items))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_facilities_food_items`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_facilities_facility_type`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_facilities_permit_status`)
    await queryRunner.query(`DROP INDEX IF EXISTS idx_facilities_location`)
    await queryRunner.query(`DROP TABLE IF EXISTS facilities`)
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis`)
  }
}
