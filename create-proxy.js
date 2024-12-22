import {promises as fs} from 'fs';
import path from 'path';
function createProxy(initialObject, fileName) {
  const filePath = path.resolve(fileName);

  // Function to save the object to a file
  async function saveToFile(obj) {
    await fs.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
  }

  // Save the initial state to the file
  saveToFile(initialObject).catch(console.error);

  // Create a proxy to monitor and save changes
  return new Proxy(initialObject, {
    set(target, prop, value) {
      target[prop] = value;
      saveToFile(target).catch(console.error);
      return true;
    },
    deleteProperty(target, prop) {
      if (prop in target) {
        delete target[prop];
        saveToFile(target).catch(console.error);
      }
      return true;
    },
  });
}

export default createProxy;
