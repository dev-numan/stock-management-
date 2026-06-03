import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as customerService from './customer.service.js';

export const getAllCustomers = asyncHandler(async (req, res) => {
  const customers = await customerService.getAllCustomers({ search: req.query.search });
  return res.json(new ApiResponse(200, customers, 'Customers fetched'));
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(req.params.id);
  return res.json(new ApiResponse(200, customer, 'Customer fetched'));
});

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(req.body);
  return res.json(new ApiResponse(201, customer, 'Customer created'));
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  return res.json(new ApiResponse(200, customer, 'Customer updated'));
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const result = await customerService.deleteCustomer(req.params.id);
  return res.json(new ApiResponse(200, result, 'Customer deleted'));
});

export const getCustomerDeletionBlockers = asyncHandler(async (req, res) => {
  const blockers = await customerService.getCustomerDeletionBlockers(req.params.id);
  return res.json(new ApiResponse(200, blockers, 'Customer deletion blockers fetched'));
});

export const getCustomerAdvanceEntries = asyncHandler(async (req, res) => {
  const entries = await customerService.getCustomerAdvanceEntries(req.params.id);
  return res.json(new ApiResponse(200, entries, 'Advance entries fetched'));
});

export const addCustomerAdvance = asyncHandler(async (req, res) => {
  const customer = await customerService.addCustomerAdvance(req.params.id, req.body);
  return res.json(new ApiResponse(200, customer, 'Advance payment recorded'));
});

export const addCustomerCreditCharge = asyncHandler(async (req, res) => {
  const customer = await customerService.addCustomerCreditCharge(req.params.id, req.body);
  return res.json(new ApiResponse(200, customer, 'Credit charge recorded'));
});

export const deleteCustomerAdvanceEntry = asyncHandler(async (req, res) => {
  const customer = await customerService.deleteCustomerAdvanceEntry(
    req.params.id,
    req.params.entryId
  );
  return res.json(new ApiResponse(200, customer, 'Payment entry deleted'));
});
