const name = 'some_script';
const description = 'Some script';
const optimizer = (name, description) => {
  return name != null && description != null;
};
optimizer(name, description);
