import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as partyService from './party.service.js';

export const getAllParties = asyncHandler(async (req, res) => {
  const type = req.query.type?.toUpperCase();
  const parties = await partyService.getAllParties({
    type: type === 'CUSTOMER' || type === 'SUPPLIER' ? type : undefined,
    search: req.query.search,
  });
  return res.json(new ApiResponse(200, parties, 'Parties fetched'));
});

export const getPartyById = asyncHandler(async (req, res) => {
  const party = await partyService.getPartyById(req.params.id);
  return res.json(new ApiResponse(200, party, 'Party fetched'));
});

export const createParty = asyncHandler(async (req, res) => {
  const party = await partyService.createParty(req.body);
  return res.json(new ApiResponse(201, party, 'Party created'));
});

export const updateParty = asyncHandler(async (req, res) => {
  const party = await partyService.updateParty(req.params.id, req.body);
  return res.json(new ApiResponse(200, party, 'Party updated'));
});

export const convertParty = asyncHandler(async (req, res) => {
  const party = await partyService.convertPartyType(req.params.id, req.body.partyType);
  return res.json(new ApiResponse(200, party, 'Party type updated'));
});

export const deleteParty = asyncHandler(async (req, res) => {
  const result = await partyService.deleteParty(req.params.id);
  return res.json(new ApiResponse(200, result, 'Party deleted'));
});

export const getPartyDeletionBlockers = asyncHandler(async (req, res) => {
  const blockers = await partyService.getPartyDeletionBlockers(req.params.id);
  return res.json(new ApiResponse(200, blockers, 'Party deletion blockers fetched'));
});

export const getPartyAdvanceEntries = asyncHandler(async (req, res) => {
  const entries = await partyService.getPartyAdvanceEntries(req.params.id);
  return res.json(new ApiResponse(200, entries, 'Advance entries fetched'));
});

export const addPartyAdvance = asyncHandler(async (req, res) => {
  const party = await partyService.addPartyAdvance(req.params.id, req.body);
  return res.json(new ApiResponse(200, party, 'Advance payment recorded'));
});

export const addPartyCreditCharge = asyncHandler(async (req, res) => {
  const party = await partyService.addPartyCreditCharge(req.params.id, req.body);
  return res.json(new ApiResponse(200, party, 'Credit charge recorded'));
});

export const deletePartyAdvanceEntry = asyncHandler(async (req, res) => {
  const party = await partyService.deletePartyAdvanceEntry(req.params.id, req.params.entryId);
  return res.json(new ApiResponse(200, party, 'Payment entry deleted'));
});

export const getPartySupplierLedger = asyncHandler(async (req, res) => {
  const ledger = await partyService.getPartySupplierLedger(req.params.id, {
    from: req.query.from,
    to: req.query.to,
    search: req.query.search,
  });
  return res.json(new ApiResponse(200, ledger, 'Supplier ledger fetched'));
});

export const addPartyPayment = asyncHandler(async (req, res) => {
  const result = await partyService.addPartyPayment(req.params.id, req.body);
  return res.json(new ApiResponse(200, result, 'Payment recorded'));
});

export const addPartyPurchase = asyncHandler(async (req, res) => {
  const result = await partyService.addPartyPurchase(req.params.id, req.body);
  return res.json(new ApiResponse(200, result, 'Purchase recorded'));
});

export const deletePartyPayment = asyncHandler(async (req, res) => {
  const result = await partyService.deletePartyPayment(req.params.id, req.params.paymentId);
  return res.json(new ApiResponse(200, result, 'Payment deleted'));
});
