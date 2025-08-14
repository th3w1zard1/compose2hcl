import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  NomadClientConfig, 
  NomadJobSubmission, 
  NomadJobResponse, 
  NomadAllocation, 
  NomadEvaluation,
  NomadNode 
} from './types/nomad-client';

export class NomadClient {
  private client: AxiosInstance;
  private config: NomadClientConfig;

  constructor(config: NomadClientConfig) {
    this.config = {
      timeout: 30000,
      region: 'global',
      namespace: 'default',
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.address,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.token && { 'X-Nomad-Token': this.config.token }),
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const { status, data } = error.response;
          throw new Error(`Nomad API error ${status}: ${data?.Error || error.message}`);
        }
        throw error;
      }
    );
  }

  /**
   * Submit a job to Nomad
   */
  async submitJob(jobHcl: string, options: { region?: string; namespace?: string } = {}): Promise<NomadJobResponse> {
    const submission: NomadJobSubmission = {
      Job: jobHcl,
      Region: options.region || this.config.region,
      Namespace: options.namespace || this.config.namespace,
    };

    const response: AxiosResponse<NomadJobResponse> = await this.client.post('/v1/jobs', submission);
    return response.data;
  }

  /**
   * Get job information
   */
  async getJob(jobId: string, options: { region?: string; namespace?: string } = {}): Promise<NomadJobResponse> {
    const params = new URLSearchParams({
      region: options.region || this.config.region || 'global',
      namespace: options.namespace || this.config.namespace || 'default',
    });

    const response: AxiosResponse<NomadJobResponse> = await this.client.get(`/v1/job/${jobId}?${params}`);
    return response.data;
  }

  /**
   * Get job allocations
   */
  async getJobAllocations(jobId: string, options: { region?: string; namespace?: string } = {}): Promise<NomadAllocation[]> {
    const params = new URLSearchParams({
      region: options.region || this.config.region || 'global',
      namespace: options.namespace || this.config.namespace || 'default',
    });

    const response: AxiosResponse<NomadAllocation[]> = await this.client.get(`/v1/job/${jobId}/allocations?${params}`);
    return response.data;
  }

  /**
   * Get job evaluations
   */
  async getJobEvaluations(jobId: string, options: { region?: string; namespace?: string } = {}): Promise<NomadEvaluation[]> {
    const params = new URLSearchParams({
      region: options.region || this.config.region || 'global',
      namespace: options.namespace || this.config.namespace || 'default',
    });

    const response: AxiosResponse<NomadEvaluation[]> = await this.client.get(`/v1/job/${jobId}/evaluations?${params}`);
    return response.data;
  }

  /**
   * Stop a job
   */
  async stopJob(jobId: string, options: { region?: string; namespace?: string; purge?: boolean } = {}): Promise<void> {
    const params = new URLSearchParams({
      region: options.region || this.config.region || 'global',
      namespace: options.namespace || this.config.namespace || 'default',
      ...(options.purge && { purge: 'true' }),
    });

    await this.client.delete(`/v1/job/${jobId}?${params}`);
  }

  /**
   * Get node information
   */
  async getNode(nodeId: string, options: { region?: string } = {}): Promise<NomadNode> {
    const params = new URLSearchParams({
      region: options.region || this.config.region || 'global',
    });

    const response: AxiosResponse<NomadNode> = await this.client.get(`/v1/node/${nodeId}?${params}`);
    return response.data;
  }

  /**
   * Get all nodes
   */
  async getNodes(options: { region?: string } = {}): Promise<NomadNode[]> {
    const params = new URLSearchParams({
      region: options.region || this.config.region || 'global',
    });

    const response: AxiosResponse<NomadNode[]> = await this.client.get(`/v1/nodes?${params}`);
    return response.data;
  }

  /**
   * Check if Nomad is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/v1/status/leader');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get Nomad status information
   */
  async getStatus(): Promise<{ leader: string; servers: string[] }> {
    const [leaderResponse, peersResponse] = await Promise.all([
      this.client.get('/v1/status/leader'),
      this.client.get('/v1/status/peers'),
    ]);

    return {
      leader: leaderResponse.data,
      servers: peersResponse.data,
    };
  }
}
