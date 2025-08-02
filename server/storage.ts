import { 
  type User, 
  type InsertUser, 
  type EthosUser, 
  type InsertEthosUser,
  type Attestation,
  type InsertAttestation,
  type TerminalSession
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getEthosUser(address: string): Promise<EthosUser | undefined>;
  getEthosUserByUsername(username: string): Promise<EthosUser | undefined>;
  createEthosUser(user: InsertEthosUser): Promise<EthosUser>;
  updateEthosUser(address: string, updates: Partial<EthosUser>): Promise<EthosUser | undefined>;
  getTopEthosUsers(limit: number, orderBy: 'xp' | 'reputation' | 'attestations'): Promise<EthosUser[]>;
  
  getAttestationsForUser(address: string): Promise<Attestation[]>;
  getAttestationsFromUser(address: string): Promise<Attestation[]>;
  createAttestation(attestation: InsertAttestation): Promise<Attestation>;
  
  getTerminalSession(id: string): Promise<TerminalSession | undefined>;
  createTerminalSession(session: Partial<TerminalSession>): Promise<TerminalSession>;
  updateTerminalSession(id: string, updates: Partial<TerminalSession>): Promise<TerminalSession | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private ethosUsers: Map<string, EthosUser>;
  private attestations: Map<string, Attestation>;
  private terminalSessions: Map<string, TerminalSession>;

  constructor() {
    this.users = new Map();
    this.ethosUsers = new Map();
    this.attestations = new Map();
    this.terminalSessions = new Map();
    
    // Initialize with mock data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock Ethos users
    const mockUsers: InsertEthosUser[] = [
      {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        username: 'alice.eth',
        xp: 15240,
        reputation: 4.8,
        attestations: 89,
        rank: 1,
        weeklyXp: 2150,
        monthlyXp: 8750
      },
      {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        username: 'vitalik.eth',
        xp: 12890,
        reputation: 4.9,
        attestations: 156,
        rank: 2,
        weeklyXp: 1890,
        monthlyXp: 7200
      },
      {
        address: '0x9876543210fedcba9876543210fedcba98765432',
        username: 'user123',
        xp: 1420,
        reputation: 3.2,
        attestations: 12,
        rank: 1247,
        weeklyXp: 420,
        monthlyXp: 1680
      },
      {
        address: '0xfedcba9876543210fedcba9876543210fedcba98',
        username: 'bob.eth',
        xp: 8750,
        reputation: 4.1,
        attestations: 67,
        rank: 5,
        weeklyXp: 1280,
        monthlyXp: 5200
      },
      {
        address: '0x5555555555555555555555555555555555555555',
        username: 'charlie.eth',
        xp: 6540,
        reputation: 3.8,
        attestations: 45,
        rank: 8,
        weeklyXp: 980,
        monthlyXp: 3800
      }
    ];

    mockUsers.forEach(user => this.createEthosUser(user));

    // Mock attestations
    const mockAttestations: InsertAttestation[] = [
      {
        fromAddress: '0x1234567890abcdef1234567890abcdef12345678',
        toAddress: '0x9876543210fedcba9876543210fedcba98765432',
        score: 4.5,
        comment: 'Great contributor to the ecosystem'
      },
      {
        fromAddress: '0xfedcba9876543210fedcba9876543210fedcba98',
        toAddress: '0x9876543210fedcba9876543210fedcba98765432',
        score: 4.0,
        comment: 'Reliable and trustworthy'
      },
      {
        fromAddress: '0x5555555555555555555555555555555555555555',
        toAddress: '0x9876543210fedcba9876543210fedcba98765432',
        score: 3.8,
        comment: 'Good participation in governance'
      }
    ];

    mockAttestations.forEach(attestation => this.createAttestation(attestation));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getEthosUser(address: string): Promise<EthosUser | undefined> {
    return Array.from(this.ethosUsers.values()).find(
      (user) => user.address.toLowerCase() === address.toLowerCase()
    );
  }

  async getEthosUserByUsername(username: string): Promise<EthosUser | undefined> {
    return Array.from(this.ethosUsers.values()).find(
      (user) => user.username?.toLowerCase() === username.toLowerCase()
    );
  }

  async createEthosUser(insertUser: InsertEthosUser): Promise<EthosUser> {
    const id = randomUUID();
    const user: EthosUser = { 
      address: insertUser.address,
      username: insertUser.username || null,
      xp: insertUser.xp || null,
      reputation: insertUser.reputation || null,
      attestations: insertUser.attestations || null,
      rank: insertUser.rank || null,
      weeklyXp: insertUser.weeklyXp || null,
      monthlyXp: insertUser.monthlyXp || null,
      id,
      lastUpdated: new Date()
    };
    this.ethosUsers.set(id, user);
    return user;
  }

  async updateEthosUser(address: string, updates: Partial<EthosUser>): Promise<EthosUser | undefined> {
    const user = await this.getEthosUser(address);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, lastUpdated: new Date() };
    this.ethosUsers.set(user.id, updatedUser);
    return updatedUser;
  }

  async getTopEthosUsers(limit: number, orderBy: 'xp' | 'reputation' | 'attestations'): Promise<EthosUser[]> {
    const users = Array.from(this.ethosUsers.values());
    users.sort((a, b) => {
      const aValue = a[orderBy] || 0;
      const bValue = b[orderBy] || 0;
      return bValue - aValue;
    });
    return users.slice(0, limit);
  }

  async getAttestationsForUser(address: string): Promise<Attestation[]> {
    return Array.from(this.attestations.values()).filter(
      (attestation) => attestation.toAddress.toLowerCase() === address.toLowerCase()
    );
  }

  async getAttestationsFromUser(address: string): Promise<Attestation[]> {
    return Array.from(this.attestations.values()).filter(
      (attestation) => attestation.fromAddress.toLowerCase() === address.toLowerCase()
    );
  }

  async createAttestation(insertAttestation: InsertAttestation): Promise<Attestation> {
    const id = randomUUID();
    const attestation: Attestation = {
      fromAddress: insertAttestation.fromAddress,
      toAddress: insertAttestation.toAddress,
      score: insertAttestation.score,
      comment: insertAttestation.comment || null,
      id,
      createdAt: new Date()
    };
    this.attestations.set(id, attestation);
    return attestation;
  }

  async getTerminalSession(id: string): Promise<TerminalSession | undefined> {
    return this.terminalSessions.get(id);
  }

  async createTerminalSession(session: Partial<TerminalSession>): Promise<TerminalSession> {
    const id = randomUUID();
    const terminalSession: TerminalSession = {
      id,
      userId: session.userId || null,
      commands: session.commands || [],
      settings: session.settings || {},
      createdAt: new Date()
    };
    this.terminalSessions.set(id, terminalSession);
    return terminalSession;
  }

  async updateTerminalSession(id: string, updates: Partial<TerminalSession>): Promise<TerminalSession | undefined> {
    const session = this.terminalSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.terminalSessions.set(id, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
