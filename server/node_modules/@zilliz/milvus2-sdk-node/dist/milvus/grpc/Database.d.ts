import { BaseClient } from './BaseClient';
import { CreateDatabaseRequest, ListDatabasesRequest, ListDatabasesResponse, DropDatabasesRequest, ResStatus } from '../';
export declare class Database extends BaseClient {
    /**
     * Creates a new database.
     *
     * @param {CreateDatabaseRequest} data - The data for the new database.
     * @param {string} data.db_name - The name of the new database.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.createDatabase({ db_name: 'new_db' });
     * ```
     */
    createDatabase(data: CreateDatabaseRequest): Promise<ResStatus>;
    /**
     * Lists all databases.
     *
     * @param {ListDatabasesRequest} data - The request parameters.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ListDatabasesResponse>} The response from the server.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const res = await milvusClient.listDatabases();
     * ```
     */
    listDatabases(data?: ListDatabasesRequest): Promise<ListDatabasesResponse>;
    /**
     * Drops a database.
     *
     * @param {DropDatabasesRequest} data - The request parameters.
     * @param {string} data.db_name - The name of the database to drop.
     * @param {number} [data.timeout] - An optional duration of time in milliseconds to allow for the RPC. If it is set to undefined, the client keeps waiting until the server responds or error occurs. Default is undefined.
     *
     * @returns {Promise<ResStatus>} The response status of the operation.
     * @returns {string} status.error_code - The error code of the operation.
     * @returns {string} status.reason - The reason for the error, if any.
     *
     * @example
     * ```
     *  const milvusClient = new milvusClient(MILUVS_ADDRESS);
     *  const resStatus = await milvusClient.dropDatabase({ db_name: 'db_to_drop' });
     * ```
     */
    dropDatabase(data: DropDatabasesRequest): Promise<ResStatus>;
}
