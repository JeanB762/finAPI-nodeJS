const express = require("express");
const { v4: UUIDv4 } = require("uuid");
const app = express();
const customers = [];

app.use(express.json());

function verifyAccountExists(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer)
    return response.status(400).json({ error: "Customer does not exists!" });

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") return acc + operation.amount;
    return acc - operation.amount;
  }, 0);

  return balance;
}

app.get("/account", verifyAccountExists, (request, response) => {
  const { customer } = request;

  return response.status(200).json(customer);
});

app.post("/account", (request, response) => {
  const { name, cpf } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists)
    return response.status(400).json({ error: "Customer already exists!" });

  customers.push({
    name,
    cpf,
    id: UUIDv4(),
    statement: [],
  });

  return response.status(201).send();
});

app.put("/account", verifyAccountExists, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.delete("/account", verifyAccountExists, (request, response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

app.get("/statement", verifyAccountExists, (request, response) => {
  const { customer } = request;
  return response.status(200).json(customer.statement);
});

app.get("/statement/date", verifyAccountExists, (request, response) => {
  const { customer } = request;
  const { date } = request.query;
  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.createdAt.toDateString() === new Date(dateFormat).toDateString()
  );
  return response.status(200).json(statement);
});

app.post("/deposit", verifyAccountExists, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    createdAt: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw", verifyAccountExists, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;
  const balance = getBalance(customer.statement);

  if (balance < amount)
    return response.status(400).json({ error: "Insufficient funds!" });

  const statementOperation = {
    amount,
    createdAt: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.get("/balance", verifyAccountExists, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.status(200).json({ balance });
});

app.listen(5000);
